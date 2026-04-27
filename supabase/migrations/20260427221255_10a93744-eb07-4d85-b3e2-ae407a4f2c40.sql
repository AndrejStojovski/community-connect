-- 1. Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS reputation_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS successful_returns INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rejected_claims INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verified_claims INTEGER NOT NULL DEFAULT 0;

-- 2. Extend reports with proof questions
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS proof_questions TEXT[] NOT NULL DEFAULT '{}';

-- 3. Claim status enum
DO $$ BEGIN
  CREATE TYPE public.claim_status AS ENUM ('pending', 'approved', 'rejected', 'disputed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. Claims table
CREATE TABLE IF NOT EXISTS public.claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL,
  claimant_id UUID NOT NULL,
  owner_id UUID NOT NULL,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  proof_image_url TEXT,
  status public.claim_status NOT NULL DEFAULT 'pending',
  owner_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_claims_report ON public.claims(report_id);
CREATE INDEX IF NOT EXISTS idx_claims_claimant ON public.claims(claimant_id);
CREATE INDEX IF NOT EXISTS idx_claims_owner ON public.claims(owner_id);

ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Claimants and owners can view their claims"
  ON public.claims FOR SELECT
  USING (
    auth.uid() = claimant_id
    OR auth.uid() = owner_id
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Authenticated users can create claims"
  ON public.claims FOR INSERT
  WITH CHECK (auth.uid() = claimant_id AND auth.uid() <> owner_id);

CREATE POLICY "Owners and admins can update claims"
  ON public.claims FOR UPDATE
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete claims"
  ON public.claims FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER claims_updated_at
  BEFORE UPDATE ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Reputation events log
CREATE TABLE IF NOT EXISTS public.reputation_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  claim_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rep_events_user ON public.reputation_events(user_id);

ALTER TABLE public.reputation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own reputation events"
  ON public.reputation_events FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 6. Notification on new claim
CREATE OR REPLACE FUNCTION public.notify_on_claim_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (
    NEW.owner_id,
    'claim',
    'New claim on your report',
    'Someone submitted a claim. Review it now.',
    '/reports/' || NEW.report_id::text
  );
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_claim_create ON public.claims;
CREATE TRIGGER trg_claim_create
  AFTER INSERT ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_claim_create();

-- 7. Reputation engine on claim status change
CREATE OR REPLACE FUNCTION public.handle_claim_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'approved' THEN
    NEW.resolved_at := now();
    -- Claimant: +1 successful return
    UPDATE public.profiles
      SET reputation_score = reputation_score + 1,
          successful_returns = successful_returns + 1
      WHERE id = NEW.claimant_id;
    INSERT INTO public.reputation_events (user_id, delta, reason, claim_id)
      VALUES (NEW.claimant_id, 1, 'Successful claim approved', NEW.id);

    -- Owner: +2 verified ownership
    UPDATE public.profiles
      SET reputation_score = reputation_score + 2,
          verified_claims = verified_claims + 1
      WHERE id = NEW.owner_id;
    INSERT INTO public.reputation_events (user_id, delta, reason, claim_id)
      VALUES (NEW.owner_id, 2, 'Verified ownership of returned item', NEW.id);

    -- Mark report resolved
    UPDATE public.reports SET status = 'resolved' WHERE id = NEW.report_id;

    INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (NEW.claimant_id, 'claim', 'Claim approved', 'Your claim was approved by the owner.', '/reports/' || NEW.report_id::text);

  ELSIF NEW.status = 'rejected' THEN
    NEW.resolved_at := now();
    UPDATE public.profiles
      SET reputation_score = reputation_score - 1,
          rejected_claims = rejected_claims + 1
      WHERE id = NEW.claimant_id;
    INSERT INTO public.reputation_events (user_id, delta, reason, claim_id)
      VALUES (NEW.claimant_id, -1, 'Claim rejected', NEW.id);

    INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (NEW.claimant_id, 'claim', 'Claim rejected', 'The owner rejected your claim.', '/reports/' || NEW.report_id::text);
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_claim_status ON public.claims;
CREATE TRIGGER trg_claim_status
  BEFORE UPDATE ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.handle_claim_status_change();

-- 8. Storage bucket for claim images
INSERT INTO storage.buckets (id, name, public)
  VALUES ('claim-images', 'claim-images', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Claim images publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'claim-images');

CREATE POLICY "Authenticated users upload own claim images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'claim-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users update own claim images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'claim-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users delete own claim images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'claim-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );