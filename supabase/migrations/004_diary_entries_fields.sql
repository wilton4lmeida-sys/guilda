ALTER TABLE public.diary_entries
  ADD COLUMN IF NOT EXISTS reunioes_marcadas_sql integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reunioes_realizadas_sql integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reunioes_remarcadas integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS no_show integer DEFAULT 0;
