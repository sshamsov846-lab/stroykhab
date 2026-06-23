-- StroyHub initial schema (objects, tasks, expenses, photos, material_requests)

-- ─── objects ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.objects (
  id TEXT PRIMARY KEY,
  block_id TEXT,
  name TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  client_name TEXT,
  client_phone TEXT,
  foreman_id TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  progress NUMERIC DEFAULT 0,
  total_houses INTEGER,
  completed_houses INTEGER,
  budget_total NUMERIC NOT NULL DEFAULT 0,
  budget_spent NUMERIC NOT NULL DEFAULT 0,
  start_date DATE,
  end_date DATE,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  is_side_job BOOLEAN DEFAULT FALSE,
  side_job_type TEXT,
  owner_foreman_key TEXT
);

-- ─── tasks ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tasks (
  id TEXT PRIMARY KEY,
  object_id TEXT NOT NULL REFERENCES public.objects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  room TEXT,
  assigned_to TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'medium',
  estimated_hours NUMERIC,
  actual_hours NUMERIC,
  start_date DATE,
  end_date DATE,
  due_date DATE,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- ─── expenses ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.expenses (
  id TEXT PRIMARY KEY,
  object_id TEXT NOT NULL REFERENCES public.objects(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'other',
  description TEXT NOT NULL DEFAULT '',
  date DATE,
  receipt_url TEXT,
  receipt_data JSONB,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── photos (photo reports) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.photos (
  id TEXT PRIMARY KEY,
  work_id TEXT,
  apartment_id TEXT,
  task_id TEXT,
  object_id TEXT NOT NULL REFERENCES public.objects(id) ON DELETE CASCADE,
  room TEXT,
  photo_url TEXT NOT NULL,
  thumbnail_url TEXT,
  type TEXT NOT NULL DEFAULT 'progress',
  description TEXT,
  taken_by TEXT,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  geolocation JSONB
);

-- ─── material_requests ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.material_requests (
  id TEXT PRIMARY KEY,
  object_id TEXT NOT NULL REFERENCES public.objects(id) ON DELETE CASCADE,
  task_id TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_by TEXT NOT NULL DEFAULT '',
  approved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_objects_foreman_id ON public.objects(foreman_id);
CREATE INDEX IF NOT EXISTS idx_objects_created_at ON public.objects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_object_id ON public.tasks(object_id);
CREATE INDEX IF NOT EXISTS idx_expenses_object_id ON public.expenses(object_id);
CREATE INDEX IF NOT EXISTS idx_photos_object_id ON public.photos(object_id);
CREATE INDEX IF NOT EXISTS idx_material_requests_object_id ON public.material_requests(object_id);

-- ─── RLS (dev: open access for anon — app auth is local for now) ─────────────
ALTER TABLE public.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_objects" ON public.objects;
CREATE POLICY "anon_all_objects" ON public.objects FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_tasks" ON public.tasks;
CREATE POLICY "anon_all_tasks" ON public.tasks FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_expenses" ON public.expenses;
CREATE POLICY "anon_all_expenses" ON public.expenses FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_photos" ON public.photos;
CREATE POLICY "anon_all_photos" ON public.photos FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_material_requests" ON public.material_requests;
CREATE POLICY "anon_all_material_requests" ON public.material_requests FOR ALL TO anon USING (true) WITH CHECK (true);

-- authenticated role (for future Supabase Auth)
DROP POLICY IF EXISTS "auth_all_objects" ON public.objects;
CREATE POLICY "auth_all_objects" ON public.objects FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_tasks" ON public.tasks;
CREATE POLICY "auth_all_tasks" ON public.tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_expenses" ON public.expenses;
CREATE POLICY "auth_all_expenses" ON public.expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_photos" ON public.photos;
CREATE POLICY "auth_all_photos" ON public.photos FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_material_requests" ON public.material_requests;
CREATE POLICY "auth_all_material_requests" ON public.material_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── storage bucket for photo uploads ──────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "photos_public_read" ON storage.objects;
CREATE POLICY "photos_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'photos');

DROP POLICY IF EXISTS "photos_anon_upload" ON storage.objects;
CREATE POLICY "photos_anon_upload" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'photos');

DROP POLICY IF EXISTS "photos_anon_update" ON storage.objects;
CREATE POLICY "photos_anon_update" ON storage.objects
  FOR UPDATE TO anon, authenticated
  USING (bucket_id = 'photos');

DROP POLICY IF EXISTS "photos_anon_delete" ON storage.objects;
CREATE POLICY "photos_anon_delete" ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (bucket_id = 'photos');
