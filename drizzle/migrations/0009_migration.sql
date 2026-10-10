CREATE OR REPLACE FUNCTION public.public_node_messages(p_node_id uuid)
 RETURNS TABLE(id uuid, node_id uuid, body text, created_at timestamp with time zone)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
 SELECT m.id, m.node_id, m.body, m.created_at FROM public.messages m JOIN public.nodes n ON n.id = m.node_id
 WHERE m.node_id = p_node_id AND m.created_at > now() - interval '48 hours'
   AND (n.kind = 'business' OR (n.kind IN ('bench','tree') AND n.garden_interactive))
 ORDER BY m.created_at DESC LIMIT 50;
$function$;