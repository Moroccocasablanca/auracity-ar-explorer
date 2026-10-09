ALTER TABLE public.nodes DROP CONSTRAINT IF EXISTS nodes_kind_check;
ALTER TABLE public.nodes ADD CONSTRAINT nodes_kind_check CHECK (kind IN ('business','monument','street','service','bench'));
ALTER TABLE public.nodes ADD COLUMN history_it text NOT NULL DEFAULT '';
ALTER TABLE public.nodes ADD COLUMN history_en text NOT NULL DEFAULT '';
ALTER TABLE public.nodes ADD COLUMN menu_source_url text;
ALTER TABLE public.nodes ADD COLUMN menu_updated_at timestamptz;
ALTER TABLE public.nodes ADD COLUMN specials_it text;
ALTER TABLE public.nodes ADD COLUMN specials_en text;
ALTER TABLE public.messages ADD COLUMN user_id uuid;