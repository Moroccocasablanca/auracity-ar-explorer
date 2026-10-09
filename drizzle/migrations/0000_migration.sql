
CREATE TABLE public.nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('business','monument','street','service')),
  name text NOT NULL,
  tagline_it text NOT NULL DEFAULT '',
  tagline_en text NOT NULL DEFAULT '',
  description_it text NOT NULL DEFAULT '',
  description_en text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  radius_m integer NOT NULL DEFAULT 30,
  hours jsonb,
  menu jsonb,
  promo_it text,
  promo_en text,
  city text NOT NULL DEFAULT 'Bra',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.nodes TO anon, authenticated;
GRANT ALL ON public.nodes TO service_role;
ALTER TABLE public.nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Nodes are public" ON public.nodes FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id uuid NOT NULL REFERENCES public.nodes(id) ON DELETE CASCADE,
  author text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_node_idx ON public.messages(node_id, created_at DESC);
GRANT SELECT ON public.messages TO anon, authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Messages are public" ON public.messages FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id uuid NOT NULL REFERENCES public.nodes(id) ON DELETE CASCADE,
  author text NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reviews_node_idx ON public.reviews(node_id, created_at DESC);
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews are public" ON public.reviews FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.receipts (
  code text PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES public.nodes(id) ON DELETE CASCADE,
  used_at timestamptz
);
GRANT ALL ON public.receipts TO service_role;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

INSERT INTO public.nodes (slug, kind, name, tagline_it, tagline_en, description_it, description_en, address, lat, lng, radius_m, hours, menu, promo_it, promo_en) VALUES
('bucheria', 'business', 'Bucheria', 'Locale vicino alla stazione', 'Local spot near the station',
 'Punto di ritrovo vicino alla stazione di Bra. Scheda dimostrativa: il titolare potrà gestire avatar AR, menu e promozioni.',
 'A meeting spot near Bra station. Demo listing: the owner will manage the AR avatar, menu and promotions.',
 'Zona stazione, Bra (CN)', 44.6962, 7.8566, 30,
 '{"open":"07:00","close":"22:00","closedDays":[]}'::jsonb,
 '[{"name":"Caffè","price":1.2},{"name":"Aperitivo piemontese","price":6.0},{"name":"Tagliere misto","price":12.0}]'::jsonb,
 'Mostra questa schermata: caffè + brioche a 2,00 €', 'Show this screen: coffee + pastry for €2.00'),
('stazione-bra', 'service', 'Stazione di Bra', 'Nodo ferroviario', 'Railway hub',
 'Stazione ferroviaria di Bra, punto di arrivo per chi visita le Langhe e il Roero.',
 'Bra railway station, the arrival point for visitors to the Langhe and Roero.',
 'Bra (CN)', 44.6958, 7.8572, 40, NULL, NULL, NULL, NULL),
('palazzo-traversa', 'monument', 'Palazzo Traversa', 'Barocco piemontese', 'Piedmontese baroque',
 'Palazzo nobiliare del Settecento nel centro storico di Bra, legato alla storia della città.',
 'An eighteenth-century noble palace in the historic centre of Bra.',
 'Via Principi di Piemonte, Bra', 44.6987, 7.8534, 30, NULL, NULL, NULL, NULL),
('chiesa-sant-andrea', 'monument', 'Chiesa di Sant''Andrea', 'Piazza Caduti della Libertà', 'Piazza Caduti della Libertà',
 'Chiesa barocca che affaccia sulla piazza, opera di Bernardo Vittone.',
 'Baroque church overlooking the square, designed by Bernardo Vittone.',
 'Piazza Caduti della Libertà, Bra', 44.6989, 7.8528, 30, NULL, NULL, NULL, NULL),
('palazzo-comunale', 'monument', 'Palazzo Comunale e Zizzola', 'Il cuore civico di Bra', 'The civic heart of Bra',
 'Palazzo del Comune, con la celebre statua di "Zizzola", simbolo della città.',
 'Town hall, home to the famous "Zizzola" figure, a symbol of the city.',
 'Via Marconi, Bra', 44.6996, 7.8548, 30, NULL, NULL, NULL, NULL),
('torre-civica', 'monument', 'Torre Civica', 'Torre storica', 'Historic tower',
 'La torre civica domina il centro storico di Bra.',
 'The civic tower rises above Bra''s historic centre.',
 'Centro storico, Bra', 44.6997, 7.8552, 25, NULL, NULL, NULL, NULL),
('madonna-dei-fiori', 'monument', 'Santuario Madonna dei Fiori', 'Santuario mariano', 'Marian sanctuary',
 'Santuario cittadino, meta di pellegrinaggio e di passeggiate.',
 'A city sanctuary, a destination for pilgrims and walkers alike.',
 'Via Madonna dei Fiori, Bra', 44.7006, 7.8566, 40, NULL, NULL, NULL, NULL),
('chiesa-santa-chiara', 'monument', 'Chiesa di Santa Chiara', 'Gioiello rococò', 'Rococo gem',
 'Una delle chiese barocche più eleganti di Bra, con pianta ellittica.',
 'One of Bra''s most elegant baroque churches, with an elliptical plan.',
 'Via Principi di Piemonte, Bra', 44.6979, 7.8527, 25, NULL, NULL, NULL, NULL),
('slow-food', 'service', 'Slow Food', 'Dove è nato il movimento', 'Where the movement was born',
 'Bra è la città natale di Slow Food, associazione internazionale per il cibo buono, pulito e giusto.',
 'Bra is the birthplace of Slow Food, the international association for good, clean and fair food.',
 'Via Mendicità Istruita, Bra', 44.7003, 7.8545, 30, NULL, NULL, NULL, NULL),
('via-vittorio-emanuele', 'street', 'Via Vittorio Emanuele II', 'Asse del centro', 'Main street of the centre',
 'Una delle vie principali del centro storico, tra negozi e portici.',
 'One of the main streets of the old town, lined with shops and arcades.',
 'Centro storico, Bra', 44.6993, 7.8562, 30, NULL, NULL, NULL, NULL),
('via-cavour', 'street', 'Via Cavour', 'Passeggio e botteghe', 'Strolling and small shops',
 'Via del centro con botteghe e locali storici.',
 'A central street of small shops and historic venues.',
 'Centro storico, Bra', 44.6985, 7.8545, 30, NULL, NULL, NULL, NULL);

INSERT INTO public.receipts (code, node_id)
SELECT c, (SELECT id FROM public.nodes WHERE slug='bucheria')
FROM unnest(ARRAY['BRA-BUCH-0001','BRA-BUCH-0002','BRA-BUCH-0003','BRA-BUCH-0004','BRA-BUCH-0005']) AS c;

INSERT INTO public.messages (node_id, author, body)
SELECT id, 'Aura', 'Benvenuto a Bra! Lascia un messaggio per chi passerà di qui.' FROM public.nodes WHERE slug IN ('chiesa-sant-andrea','palazzo-comunale');
INSERT INTO public.reviews (node_id, author, rating, body)
SELECT id, 'Giulia', 5, 'Ottimo caffè e personale gentile, comodo appena scesi dal treno.' FROM public.nodes WHERE slug='bucheria';
