-- Guru bisa lihat nama siswa pengumpul & menilai submission modul miliknya

-- Nama siswa untuk daftar pengumpulan
CREATE POLICY "Gurus read submitter profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM activity_submissions s
      INNER JOIN literacy_activities la ON la.id = s.activity_id
      WHERE s.user_id = profiles.id
        AND la.created_by = auth.uid()
    )
  );

-- Pastikan policy baca/tulis submission guru (idempotent)
DROP POLICY IF EXISTS "Staff read submissions for review" ON activity_submissions;
DROP POLICY IF EXISTS "Staff grade submissions" ON activity_submissions;

CREATE POLICY "Staff read submissions for review" ON activity_submissions
  FOR SELECT USING (
    is_admin()
    OR auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM literacy_activities la
      WHERE la.id = activity_id AND la.created_by = auth.uid()
    )
  );

CREATE POLICY "Staff grade submissions" ON activity_submissions
  FOR UPDATE
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM literacy_activities la
      WHERE la.id = activity_id AND la.created_by = auth.uid()
    )
  )
  WITH CHECK (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM literacy_activities la
      WHERE la.id = activity_id AND la.created_by = auth.uid()
    )
  );
