CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  account_type text NOT NULL DEFAULT 'user' CHECK (account_type IN ('user','business')),
  display_name text NOT NULL DEFAULT '' CHECK (char_length(display_name) <= 40),
  business_name text CHECK (char_length(business_name) <= 80),
  business_status text NOT NULL DEFAULT 'none' CHECK (business_status IN ('none','pending','active')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
-- Users may edit their names only; account_type / business_status are changed server-side.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name) ON public.profiles TO authenticated;
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  t text := coalesce(NEW.raw_user_meta_data->>'account_type', 'user');
  bn text := nullif(left(trim(coalesce(NEW.raw_user_meta_data->>'business_name', '')), 80), '');
BEGIN
  IF t NOT IN ('user','business') THEN t := 'user'; END IF;
  INSERT INTO public.profiles (id, account_type, display_name, business_name, business_status)
  VALUES (
    NEW.id, t,
    left(coalesce(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', ''), 40),
    CASE WHEN t = 'business' THEN bn END,
    CASE WHEN t = 'business' THEN 'pending' ELSE 'none' END
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();