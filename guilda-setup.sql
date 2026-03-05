-- ============================================================
-- GUILDA — SQL COMPLETO PARA SUPABASE
-- Rode no SQL Editor do Supabase (painel → SQL Editor → New Query)
-- ============================================================


-- ============================================================
-- 1. TABELA: profiles
-- Criada automaticamente quando o usuário se cadastra
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'bdr' CHECK (role IN ('bdr', 'admin')),
  level INTEGER NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 7),
  level_name TEXT NOT NULL DEFAULT 'Recruta',
  xp INTEGER NOT NULL DEFAULT 0,
  avatar_initials TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index para ranking
CREATE INDEX IF NOT EXISTS idx_profiles_xp ON public.profiles(xp DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);


-- ============================================================
-- 2. TABELA: diary_entries
-- Diário de métricas diárias do BDR
-- ============================================================
CREATE TABLE IF NOT EXISTS public.diary_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  contatos_tentados INTEGER NOT NULL DEFAULT 0,
  ligacoes_atendidas INTEGER NOT NULL DEFAULT 0,
  conexao_decisor INTEGER NOT NULL DEFAULT 0,
  reunioes_marcadas INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)  -- Um registro por dia por usuário
);

CREATE INDEX IF NOT EXISTS idx_diary_user_date ON public.diary_entries(user_id, date DESC);


-- ============================================================
-- 3. TABELA: missions
-- Missões criadas pelo admin
-- ============================================================
CREATE TABLE IF NOT EXISTS public.missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'prospecção' CHECK (category IN ('prospecção', 'estudo', 'prática', 'encontro')),
  xp_reward INTEGER NOT NULL DEFAULT 100,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_missions_week ON public.missions(week_start, week_end);


-- ============================================================
-- 4. TABELA: mission_progress
-- Progresso de cada BDR em cada missão
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mission_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, mission_id)  -- Um progresso por missão por usuário
);

CREATE INDEX IF NOT EXISTS idx_mp_user ON public.mission_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_mp_mission ON public.mission_progress(mission_id);


-- ============================================================
-- 5. TABELA: meetings
-- Encontros agendados pelo admin
-- ============================================================
CREATE TABLE IF NOT EXISTS public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  meeting_type TEXT NOT NULL DEFAULT 'geral' CHECK (meeting_type IN ('geral', 'mentor', 'especial')),
  meeting_date DATE NOT NULL,
  meeting_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  link TEXT DEFAULT '',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meetings_date ON public.meetings(meeting_date DESC);


-- ============================================================
-- 6. TABELA: meeting_attendance
-- Presença dos BDRs nos encontros
-- ============================================================
CREATE TABLE IF NOT EXISTS public.meeting_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  attended BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(user_id, meeting_id)
);


-- ============================================================
-- 7. FUNCTION + TRIGGER: Auto-criar profile no signup
-- Quando o usuário se cadastra no auth, cria o profile automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
  v_initials TEXT;
BEGIN
  -- Pega os dados que vieram do signup (user_metadata)
  v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  v_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', TRIM(v_first_name || ' ' || v_last_name));
  
  -- Gera iniciais (ex: "Raul Costa" → "RC")
  v_initials := UPPER(
    LEFT(v_first_name, 1) || LEFT(v_last_name, 1)
  );

  INSERT INTO public.profiles (id, full_name, email, role, level, level_name, xp, avatar_initials)
  VALUES (
    NEW.id,
    v_full_name,
    COALESCE(NEW.email, ''),
    'bdr',           -- Todos entram como BDR (admin é setado manualmente)
    1,               -- Nível 1
    'Recruta',       -- Nome do nível
    0,               -- XP zero
    v_initials
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove trigger anterior se existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Cria o trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- 8. FUNCTION: Atualizar nível baseado no XP
-- Chamada automaticamente quando o XP muda
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_level()
RETURNS TRIGGER AS $$
DECLARE
  v_level INTEGER;
  v_level_name TEXT;
BEGIN
  -- Tabela de níveis
  CASE
    WHEN NEW.xp >= 5000 THEN v_level := 7; v_level_name := 'Lorde';
    WHEN NEW.xp >= 4000 THEN v_level := 6; v_level_name := 'Mestre';
    WHEN NEW.xp >= 3000 THEN v_level := 5; v_level_name := 'Comandante';
    WHEN NEW.xp >= 2000 THEN v_level := 4; v_level_name := 'Caçador';
    WHEN NEW.xp >= 1000 THEN v_level := 3; v_level_name := 'Guerreiro';
    WHEN NEW.xp >= 400  THEN v_level := 2; v_level_name := 'Escudeiro';
    ELSE                      v_level := 1; v_level_name := 'Recruta';
  END CASE;

  NEW.level := v_level;
  NEW.level_name := v_level_name;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_xp_change ON public.profiles;

CREATE TRIGGER on_xp_change
  BEFORE UPDATE OF xp ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_level();


-- ============================================================
-- 9. ROW LEVEL SECURITY (RLS)
-- Controla quem pode ver/editar o quê
-- ============================================================

-- Habilita RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_attendance ENABLE ROW LEVEL SECURITY;

-- PROFILES: Todos podem ver (ranking), só o próprio ou admin edita
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_update_admin" ON public.profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- DIARY: Cada um vê/edita o seu, admin vê todos
CREATE POLICY "diary_select_own" ON public.diary_entries FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "diary_insert_own" ON public.diary_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "diary_update_own" ON public.diary_entries FOR UPDATE USING (auth.uid() = user_id);

-- MISSIONS: Todos veem, só admin cria/edita
CREATE POLICY "missions_select" ON public.missions FOR SELECT USING (true);
CREATE POLICY "missions_insert_admin" ON public.missions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "missions_update_admin" ON public.missions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "missions_delete_admin" ON public.missions FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- MISSION PROGRESS: Cada um vê/edita o seu, admin vê todos
CREATE POLICY "mp_select" ON public.mission_progress FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "mp_insert" ON public.mission_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mp_update" ON public.mission_progress FOR UPDATE USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- MEETINGS: Todos veem, só admin cria/edita
CREATE POLICY "meetings_select" ON public.meetings FOR SELECT USING (true);
CREATE POLICY "meetings_insert_admin" ON public.meetings FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "meetings_update_admin" ON public.meetings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ATTENDANCE: Cada um vê/edita o seu, admin vê todos
CREATE POLICY "attendance_select" ON public.meeting_attendance FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "attendance_insert" ON public.meeting_attendance FOR INSERT WITH CHECK (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "attendance_update" ON public.meeting_attendance FOR UPDATE USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);


-- ============================================================
-- 10. PRONTO!
-- Agora rode este SQL no Supabase e siga o passo a passo.
-- ============================================================
