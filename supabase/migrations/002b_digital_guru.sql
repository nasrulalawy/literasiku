-- LANGKAH 2 — Jalankan SETELAH 002a_add_guru_enum.sql berhasil.
-- Literasiku: perpustakaan digital + role guru

ALTER TABLE books
  ADD COLUMN IF NOT EXISTS pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE books DROP COLUMN IF EXISTS stock;
ALTER TABLE books DROP COLUMN IF EXISTS available;

DROP TRIGGER IF EXISTS loan_created_trigger ON loans;
DROP TRIGGER IF EXISTS loan_returned_trigger ON loans;

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

DROP POLICY IF EXISTS "Admins manage books" ON books;
CREATE POLICY "Staff manage books" ON books FOR ALL USING (can_manage_books());

DROP POLICY IF EXISTS "Admins upload book covers" ON storage.objects;
DROP POLICY IF EXISTS "Admins update book covers" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete book covers" ON storage.objects;

CREATE POLICY "Staff upload book covers" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'book-covers' AND can_manage_books());

CREATE POLICY "Staff update book covers" ON storage.objects
  FOR UPDATE USING (bucket_id = 'book-covers' AND can_manage_books());

CREATE POLICY "Staff delete book covers" ON storage.objects
  FOR DELETE USING (bucket_id = 'book-covers' AND can_manage_books());

INSERT INTO storage.buckets (id, name, public) VALUES ('book-pdfs', 'book-pdfs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read book pdfs" ON storage.objects
  FOR SELECT USING (bucket_id = 'book-pdfs');

CREATE POLICY "Staff upload book pdfs" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'book-pdfs' AND can_manage_books());

CREATE POLICY "Staff update book pdfs" ON storage.objects
  FOR UPDATE USING (bucket_id = 'book-pdfs' AND can_manage_books());

CREATE POLICY "Staff delete book pdfs" ON storage.objects
  FOR DELETE USING (bucket_id = 'book-pdfs' AND can_manage_books());
