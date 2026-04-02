ALTER TABLE public.diary_entries
  ADD COLUMN IF NOT EXISTS user_name text;
