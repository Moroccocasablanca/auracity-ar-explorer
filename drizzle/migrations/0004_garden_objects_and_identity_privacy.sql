ALTER TABLE public.nodes ADD COLUMN garden_interactive boolean NOT NULL DEFAULT false;
UPDATE public.nodes SET garden_interactive = true WHERE kind = 'bench' AND slug = 'panchina-zizzola';
COMMENT ON COLUMN public.nodes.garden_interactive IS 'Only verified garden benches and trees may animate or host user messages.';
CREATE OR REPLACE FUNCTION public.guard_node_messages() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.nodes WHERE id = NEW.node_id AND (kind = 'business' OR (kind IN ('bench','tree') AND garden_interactive))) THEN
  RAISE EXCEPTION 'Protected places are information-only';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER guard_node_messages BEFORE INSERT OR UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.guard_node_messages();
CREATE OR REPLACE FUNCTION public.public_node_messages(p_node_id uuid)
RETURNS TABLE(id uuid, node_id uuid, body text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT m.id, m.node_id, m.body, m.created_at FROM public.messages m JOIN public.nodes n ON n.id = m.node_id
 WHERE m.node_id = p_node_id AND (n.kind = 'business' OR (n.kind IN ('bench','tree') AND n.garden_interactive)) ORDER BY m.created_at DESC LIMIT 50;
$$;
CREATE OR REPLACE FUNCTION public.public_node_reviews(p_node_id uuid)
RETURNS TABLE(id uuid, node_id uuid, rating integer, body text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT r.id, r.node_id, r.rating, r.body, r.created_at FROM public.reviews r WHERE r.node_id = p_node_id ORDER BY r.created_at DESC LIMIT 50;
$$;
REVOKE ALL ON FUNCTION public.public_node_messages(uuid), public.public_node_reviews(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_node_messages(uuid), public.public_node_reviews(uuid) TO anon, authenticated, service_role;
DROP POLICY IF EXISTS "Messages are public" ON public.messages;
DROP POLICY IF EXISTS "Reviews are public" ON public.reviews;
REVOKE SELECT ON public.messages, public.reviews FROM anon, authenticated;
GRANT ALL ON public.messages, public.reviews TO service_role;