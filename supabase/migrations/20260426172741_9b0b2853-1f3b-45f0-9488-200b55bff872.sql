
-- Fix search_path on functions
ALTER FUNCTION public.set_updated_at() SET search_path = public;

-- Tighten notifications insert: must be authenticated
DROP POLICY "System can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated can insert notifications"
  ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

-- Replace public-listing policy on storage with read-by-known-path only is hard;
-- Make bucket non-public-listable by removing the broad SELECT and granting per-object via signed/public URL pattern.
-- Since bucket is public=true, files are still reachable by URL. We restrict SELECT (listing) to owners + admins.
DROP POLICY "Report images publicly readable" ON storage.objects;
CREATE POLICY "Owners and admins can list report images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'report-images'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'))
  );
