ALTER TABLE public.nodes ADD COLUMN IF NOT EXISTS subscribed boolean NOT NULL DEFAULT false;
ALTER TABLE public.nodes ADD COLUMN IF NOT EXISTS osm_id text UNIQUE;
ALTER TABLE public.nodes ADD COLUMN IF NOT EXISTS venue_type text;
UPDATE public.nodes SET subscribed = true WHERE kind = 'business';