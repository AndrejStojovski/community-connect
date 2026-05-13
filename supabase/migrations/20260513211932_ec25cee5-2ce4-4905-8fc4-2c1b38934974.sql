-- 1. Multi-image support
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS images text[] NOT NULL DEFAULT '{}'::text[];

-- Backfill images[] from existing image_url
UPDATE public.reports
SET images = ARRAY[image_url]
WHERE image_url IS NOT NULL AND (images IS NULL OR array_length(images,1) IS NULL);

-- 2. Spam flags table
CREATE TABLE IF NOT EXISTS public.report_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL,
  flagger_id uuid NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (report_id, flagger_id)
);

ALTER TABLE public.report_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can flag reports"
  ON public.report_flags FOR INSERT
  WITH CHECK (auth.uid() = flagger_id AND NOT public.is_banned(auth.uid()));

CREATE POLICY "Flagger or admin can view"
  ON public.report_flags FOR SELECT
  USING (auth.uid() = flagger_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete flags"
  ON public.report_flags FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Helper: notify all admins
CREATE OR REPLACE FUNCTION public.notify_admins(_title text, _body text, _link text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, link)
  SELECT ur.user_id, 'moderation', _title, _body, _link
  FROM public.user_roles ur
  WHERE ur.role = 'admin';
END;
$$;

-- 4. Auto-ban helper (24h temporary)
CREATE OR REPLACE FUNCTION public.auto_temp_ban(_user_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _existing boolean;
  _name text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_bans
    WHERE user_id = _user_id
      AND (expires_at IS NULL OR expires_at > now())
  ) INTO _existing;

  IF _existing THEN
    RETURN;
  END IF;

  INSERT INTO public.user_bans (user_id, ban_type, reason, notes, banned_by, expires_at)
  VALUES (
    _user_id,
    'temporary',
    _reason,
    'Automatic ban issued by spam-protection system. Awaiting admin review.',
    _user_id,
    now() + interval '24 hours'
  );

  SELECT display_name INTO _name FROM public.profiles WHERE id = _user_id;

  PERFORM public.notify_admins(
    'Auto-ban: review needed',
    COALESCE(_name, 'A user') || ' was temporarily banned (' || _reason || '). Decide whether to make permanent.',
    '/admin?tab=bans'
  );
END;
$$;

-- 5. Trigger: rate-limit reports
CREATE OR REPLACE FUNCTION public.check_report_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count int;
BEGIN
  SELECT count(*) INTO _count
  FROM public.reports
  WHERE user_id = NEW.user_id
    AND created_at > now() - interval '10 minutes';

  IF _count >= 5 THEN
    PERFORM public.auto_temp_ban(NEW.user_id, 'Spam: too many reports in a short time');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reports_rate_limit ON public.reports;
CREATE TRIGGER trg_reports_rate_limit
AFTER INSERT ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.check_report_rate_limit();

-- 6. Trigger: spam-flag threshold
CREATE OR REPLACE FUNCTION public.check_flag_threshold()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner uuid;
  _flags int;
BEGIN
  SELECT user_id INTO _owner FROM public.reports WHERE id = NEW.report_id;
  IF _owner IS NULL THEN RETURN NEW; END IF;

  SELECT count(DISTINCT flagger_id) INTO _flags
  FROM public.report_flags WHERE report_id = NEW.report_id;

  IF _flags >= 3 THEN
    PERFORM public.auto_temp_ban(_owner, 'Spam: report flagged by community');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_flag_threshold ON public.report_flags;
CREATE TRIGGER trg_flag_threshold
AFTER INSERT ON public.report_flags
FOR EACH ROW EXECUTE FUNCTION public.check_flag_threshold();