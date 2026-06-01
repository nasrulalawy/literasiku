-- Literasi modul: guru buat materi, siswa baca + kuis + tugas, skor & review

ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'literacy_module';

ALTER TABLE literacy_activities
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS content_url TEXT,
  ADD COLUMN IF NOT EXISTS reading_text TEXT,
  ADD COLUMN IF NOT EXISTS quiz_questions JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS assignment_prompt TEXT,
  ADD COLUMN IF NOT EXISTS max_score INTEGER NOT NULL DEFAULT 100 CHECK (max_score > 0);

ALTER TABLE activity_submissions
  ADD COLUMN IF NOT EXISTS score INTEGER CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  ADD COLUMN IF NOT EXISTS read_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS graded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS feedback TEXT;

CREATE OR REPLACE FUNCTION can_manage_literacy()
RETURNS BOOLEAN AS $$
  SELECT is_admin() OR is_guru();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION owns_literacy_activity(act_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM literacy_activities
    WHERE id = act_id AND created_by = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Poin saat disetujui: proporsional skor / max_score
CREATE OR REPLACE FUNCTION on_submission_approved()
RETURNS TRIGGER AS $$
DECLARE
  reward INTEGER;
  max_pts INTEGER;
  act_max INTEGER;
  final_score INTEGER;
BEGIN
  IF OLD.status != 'approved' AND NEW.status = 'approved' THEN
    SELECT points_reward, max_score INTO reward, act_max
    FROM literacy_activities WHERE id = NEW.activity_id;

    final_score := COALESCE(NEW.score, (NEW.content->>'quiz_score')::INTEGER, 0);
    max_pts := GREATEST(act_max, 1);
    NEW.points_awarded := GREATEST(0, ROUND(reward::NUMERIC * LEAST(final_score, max_pts) / max_pts));
    NEW.score := LEAST(COALESCE(NEW.score, final_score), max_pts);

    UPDATE profiles SET points = points + NEW.points_awarded WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- RLS literacy_activities
DROP POLICY IF EXISTS "Members read active activities" ON literacy_activities;
DROP POLICY IF EXISTS "Admins manage activities" ON literacy_activities;

CREATE POLICY "Members read active activities" ON literacy_activities
  FOR SELECT TO authenticated
  USING (active = true OR is_admin() OR (is_guru() AND created_by = auth.uid()));

CREATE POLICY "Staff manage literacy activities" ON literacy_activities
  FOR ALL USING (
    is_admin() OR (is_guru() AND (created_by = auth.uid() OR created_by IS NULL))
  );

-- RLS submissions: guru review tugas modul miliknya
DROP POLICY IF EXISTS "Admins manage submissions" ON activity_submissions;

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
  FOR UPDATE USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM literacy_activities la
      WHERE la.id = activity_id AND la.created_by = auth.uid()
    )
  );

CREATE POLICY "Admins manage all submissions" ON activity_submissions
  FOR ALL USING (is_admin());

-- Storage literasi
INSERT INTO storage.buckets (id, name, public) VALUES ('literacy-files', 'literacy-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read literacy files" ON storage.objects
  FOR SELECT USING (bucket_id = 'literacy-files');

CREATE POLICY "Staff upload literacy files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'literacy-files' AND can_manage_literacy());

CREATE POLICY "Staff update literacy files" ON storage.objects
  FOR UPDATE USING (bucket_id = 'literacy-files' AND can_manage_literacy());

CREATE POLICY "Staff delete literacy files" ON storage.objects
  FOR DELETE USING (bucket_id = 'literacy-files' AND can_manage_literacy());
