-- Literasiku initial schema (perpustakaan digital)

CREATE TYPE user_role AS ENUM ('member', 'guru', 'admin');
CREATE TYPE activity_type AS ENUM ('quiz', 'reading_log', 'review');
CREATE TYPE submission_status AS ENUM ('pending', 'approved', 'rejected');

-- Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  role user_role NOT NULL DEFAULT 'member',
  avatar_url TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Books (digital only)
CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  isbn TEXT,
  category TEXT NOT NULL DEFAULT 'Umum',
  cover_url TEXT,
  pdf_url TEXT,
  description TEXT,
  published_year INTEGER,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Literacy activities
CREATE TABLE literacy_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type activity_type NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  points_reward INTEGER NOT NULL DEFAULT 10 CHECK (points_reward >= 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activity submissions
CREATE TABLE activity_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES literacy_activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content JSONB NOT NULL DEFAULT '{}',
  status submission_status NOT NULL DEFAULT 'pending',
  points_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (activity_id, user_id)
);

-- Auto-create profile on signup (role from metadata: member | guru)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  chosen_role user_role;
BEGIN
  chosen_role := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'role', '')::user_role,
    'member'::user_role
  );
  IF chosen_role NOT IN ('member', 'guru') THEN
    chosen_role := 'member';
  END IF;

  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    chosen_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Award points when submission approved
CREATE OR REPLACE FUNCTION on_submission_approved()
RETURNS TRIGGER AS $$
DECLARE
  reward INTEGER;
BEGIN
  IF OLD.status != 'approved' AND NEW.status = 'approved' THEN
    SELECT points_reward INTO reward FROM literacy_activities WHERE id = NEW.activity_id;
    NEW.points_awarded := reward;
    UPDATE profiles SET points = points + reward WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER submission_approved_trigger
  BEFORE UPDATE ON activity_submissions
  FOR EACH ROW EXECUTE FUNCTION on_submission_approved();

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_guru()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'guru'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION can_manage_books()
RETURNS BOOLEAN AS $$
  SELECT is_admin() OR is_guru();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE literacy_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins read all profiles" ON profiles FOR SELECT USING (is_admin());
CREATE POLICY "Admins update profiles" ON profiles FOR UPDATE USING (is_admin());

CREATE POLICY "Anyone authenticated reads books" ON books FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage books" ON books FOR ALL USING (can_manage_books());

CREATE POLICY "Members read active activities" ON literacy_activities
  FOR SELECT TO authenticated USING (active = true OR is_admin());
CREATE POLICY "Admins manage activities" ON literacy_activities FOR ALL USING (is_admin());

CREATE POLICY "Members read own submissions" ON activity_submissions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Members create own submissions" ON activity_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members update own pending submissions" ON activity_submissions
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Admins manage submissions" ON activity_submissions FOR ALL USING (is_admin());

INSERT INTO storage.buckets (id, name, public) VALUES ('book-covers', 'book-covers', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) VALUES ('book-pdfs', 'book-pdfs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read book covers" ON storage.objects
  FOR SELECT USING (bucket_id = 'book-covers');

CREATE POLICY "Staff upload book covers" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'book-covers' AND can_manage_books());

CREATE POLICY "Staff update book covers" ON storage.objects
  FOR UPDATE USING (bucket_id = 'book-covers' AND can_manage_books());

CREATE POLICY "Staff delete book covers" ON storage.objects
  FOR DELETE USING (bucket_id = 'book-covers' AND can_manage_books());

CREATE POLICY "Public read book pdfs" ON storage.objects
  FOR SELECT USING (bucket_id = 'book-pdfs');

CREATE POLICY "Staff upload book pdfs" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'book-pdfs' AND can_manage_books());

CREATE POLICY "Staff update book pdfs" ON storage.objects
  FOR UPDATE USING (bucket_id = 'book-pdfs' AND can_manage_books());

CREATE POLICY "Staff delete book pdfs" ON storage.objects
  FOR DELETE USING (bucket_id = 'book-pdfs' AND can_manage_books());

INSERT INTO literacy_activities (title, type, description, points_reward, active) VALUES
  ('Log Membaca Mingguan', 'reading_log', 'Catat buku digital yang Anda baca minggu ini (min. 50 kata).', 15, true),
  ('Resensi Buku Favorit', 'review', 'Tulis resensi singkat tentang buku yang baru dibaca.', 25, true),
  ('Kuis Literasi Dasar', 'quiz', 'Jawab pertanyaan singkat tentang etika membaca.', 10, true);
