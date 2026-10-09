REVOKE ALL ON FUNCTION public.accept_friend_invite(uuid), public.accepted_friends() FROM anon;
REVOKE ALL ON public.friend_invites FROM anon;
GRANT EXECUTE ON FUNCTION public.accept_friend_invite(uuid), public.accepted_friends() TO authenticated, service_role;