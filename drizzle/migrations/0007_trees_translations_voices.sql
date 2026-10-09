ALTER TABLE public.nodes DROP CONSTRAINT nodes_kind_check;
ALTER TABLE public.nodes ADD CONSTRAINT nodes_kind_check CHECK (kind = ANY (ARRAY['business','monument','street','service','bench','tree']));

CREATE TABLE public.node_translations (
  node_id uuid NOT NULL REFERENCES public.nodes(id) ON DELETE CASCADE,
  lang text NOT NULL,
  name text NOT NULL DEFAULT '',
  tagline text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  history text NOT NULL DEFAULT '',
  promo text,
  source_hash text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (node_id, lang)
);
GRANT SELECT ON public.node_translations TO anon, authenticated;
GRANT ALL ON public.node_translations TO service_role;
ALTER TABLE public.node_translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Translations are public" ON public.node_translations FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.voice_cache (
  key text PRIMARY KEY,
  path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.voice_cache TO service_role;
ALTER TABLE public.voice_cache ENABLE ROW LEVEL SECURITY;