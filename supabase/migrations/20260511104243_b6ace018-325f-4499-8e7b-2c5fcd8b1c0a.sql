
CREATE TYPE public.ban_type AS ENUM ('temporary', 'permanent', 'warning');

CREATE TABLE public.user_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ban_type public.ban_type NOT NULL DEFAULT 'permanent',
  reason text NOT NULL,
  notes text,
  banned_by uuid NOT NULL,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_bans_user ON public.user_bans(user_id);
ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage bans" ON public.user_bans
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users view own ban" ON public.user_bans
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.is_banned(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_bans
    WHERE user_id = _user_id
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

CREATE TABLE public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_actor ON public.admin_audit_logs(actor_id, created_at DESC);
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view audit" ON public.admin_audit_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert audit" ON public.admin_audit_logs
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') AND auth.uid() = actor_id);

CREATE TABLE public.report_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  report_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, report_id)
);
CREATE INDEX idx_bookmarks_user ON public.report_bookmarks(user_id);
ALTER TABLE public.report_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own bookmarks" ON public.report_bookmarks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.report_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL,
  viewer_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_views_report ON public.report_views(report_id);
ALTER TABLE public.report_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record view" ON public.report_views
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read views" ON public.report_views
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Reports viewable by everyone" ON public.reports;
CREATE POLICY "Reports viewable by everyone" ON public.reports
  FOR SELECT USING (
    NOT public.is_banned(user_id)
    OR auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Authenticated users can create reports" ON public.reports;
CREATE POLICY "Authenticated users can create reports" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = user_id AND NOT public.is_banned(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can create claims" ON public.claims;
CREATE POLICY "Authenticated users can create claims" ON public.claims
  FOR INSERT WITH CHECK (auth.uid() = claimant_id AND auth.uid() <> owner_id AND NOT public.is_banned(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can send messages" ON public.messages;
CREATE POLICY "Authenticated users can send messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id AND NOT public.is_banned(auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.claims;
