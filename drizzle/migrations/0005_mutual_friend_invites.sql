CREATE TABLE public.friend_invites (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, receiver_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE, accepted_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT ON public.friend_invites TO authenticated;
GRANT ALL ON public.friend_invites TO service_role;
ALTER TABLE public.friend_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sender creates own invitation" ON public.friend_invites FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND receiver_id IS NULL AND accepted_at IS NULL);
CREATE POLICY "Participants read own invitations" ON public.friend_invites FOR SELECT TO authenticated USING (sender_id = auth.uid() OR receiver_id = auth.uid());
CREATE OR REPLACE FUNCTION public.accept_friend_invite(invite_code uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE changed integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 UPDATE public.friend_invites SET receiver_id = auth.uid(), accepted_at = now() WHERE id = invite_code AND sender_id <> auth.uid() AND receiver_id IS NULL AND accepted_at IS NULL;
 GET DIAGNOSTICS changed = ROW_COUNT;
 RETURN changed = 1;
END;
$$;
CREATE OR REPLACE FUNCTION public.accepted_friends() RETURNS TABLE(friend_id uuid, display_name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT DISTINCT p.id, p.display_name FROM public.friend_invites f JOIN public.profiles p ON p.id = CASE WHEN f.sender_id = auth.uid() THEN f.receiver_id ELSE f.sender_id END
 WHERE auth.uid() IS NOT NULL AND f.accepted_at IS NOT NULL AND f.receiver_id IS NOT NULL AND (f.sender_id = auth.uid() OR f.receiver_id = auth.uid());
$$;
REVOKE ALL ON FUNCTION public.accept_friend_invite(uuid), public.accepted_friends() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_friend_invite(uuid), public.accepted_friends() TO authenticated, service_role;