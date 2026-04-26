
-- Restrict client inserts to self
DROP POLICY "Authenticated can insert notifications" ON public.notifications;
CREATE POLICY "Users insert own notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Trigger: when a message is inserted, notify recipient
CREATE OR REPLACE FUNCTION public.notify_on_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (
    NEW.recipient_id,
    'message',
    'New message',
    LEFT(NEW.content, 100),
    '/messages?report=' || NEW.report_id::text
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_message();
