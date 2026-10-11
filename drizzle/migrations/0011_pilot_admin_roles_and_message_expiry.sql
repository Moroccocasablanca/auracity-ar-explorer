DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
CREATE POLICY "Users read own roles" ON public.user_roles
FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.public_node_messages(p_node_id uuid)
RETURNS TABLE(id uuid, node_id uuid, body text, created_at timestamp with time zone)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.messages m
  USING public.nodes n
  WHERE m.node_id = n.id
    AND n.kind IN ('bench', 'tree')
    AND n.garden_interactive
    AND m.created_at <= now() - interval '48 hours';

  RETURN QUERY
  SELECT m.id, m.node_id, m.body, m.created_at
  FROM public.messages m
  JOIN public.nodes n ON n.id = m.node_id
  WHERE m.node_id = p_node_id
    AND m.created_at > now() - interval '48 hours'
    AND (n.kind = 'business' OR (n.kind IN ('bench','tree') AND n.garden_interactive))
  ORDER BY m.created_at DESC
  LIMIT 50;
END;
$$;
REVOKE ALL ON FUNCTION public.public_node_messages(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_node_messages(uuid) TO anon, authenticated, service_role;