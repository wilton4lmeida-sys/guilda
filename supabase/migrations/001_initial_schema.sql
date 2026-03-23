-- ═══════════════════════════════════════════════════════════════
-- GUILDA REPO — Schema inicial Supabase
-- Execute no SQL Editor do Supabase para criar tabelas e RLS
-- ═══════════════════════════════════════════════════════════════

-- ── PROFILES (perfil do membro) ──
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  xp INTEGER DEFAULT 0,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  commission_tier TEXT,
  badge_slug TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── LEVELS (configuração de níveis/insígnias) ──
CREATE TABLE IF NOT EXISTS levels (
  level INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  min_xp INTEGER NOT NULL,
  max_xp INTEGER,
  emoji TEXT,
  badge_image_url TEXT,
  commission_info TEXT,
  meta_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── MEETINGS (encontros/agenda) ──
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  time TEXT,
  location TEXT,
  type TEXT DEFAULT 'online' CHECK (type IN ('online', 'presencial')),
  status TEXT DEFAULT 'agendado' CHECK (status IN ('agendado', 'concluido', 'cancelado')),
  confirmed BOOLEAN DEFAULT false,
  min_level INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── MISSIONS (definição de missões) ──
CREATE TABLE IF NOT EXISTS missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('Diária', 'Semanal', 'Mensal')),
  tipo TEXT,
  xp_reward INTEGER DEFAULT 0,
  min_level INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  week_start DATE,
  week_end DATE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── MISSION_PROGRESS (progresso do usuário nas missões) ──
CREATE TABLE IF NOT EXISTS mission_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'atrasada')),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(mission_id, user_id)
);

-- ── AULAS (arsenal de materiais — compatível com código existente) ──
CREATE TABLE IF NOT EXISTS aulas (
  id INTEGER PRIMARY KEY,
  topic TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'pdf' CHECK (type IN ('video', 'pdf', 'script', 'template', 'audio')),
  xp_reward INTEGER DEFAULT 0,
  min_level INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  video_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── MATERIAL_PROGRESS (progresso nos materiais) ──
CREATE TABLE IF NOT EXISTS material_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  material_id INTEGER NOT NULL REFERENCES aulas(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  quiz_answers JSONB,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, material_id)
);

-- ── DIARY_ENTRIES (diário do membro) ──
CREATE TABLE IF NOT EXISTS diary_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  contatos_tentados INTEGER DEFAULT 0,
  ligacoes_atendidas INTEGER DEFAULT 0,
  conexao_decisor INTEGER DEFAULT 0,
  reunioes_marcadas INTEGER DEFAULT 0,
  reunioes_realizadas INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- ── SALES (negócios/vendas — para funil futuro) ──
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'lead' CHECK (status IN ('lead', 'proposta', 'fechado', 'perdido')),
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_xp ON profiles(xp DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(date);
CREATE INDEX IF NOT EXISTS idx_missions_week ON missions(week_start, week_end);
CREATE INDEX IF NOT EXISTS idx_mission_progress_user ON mission_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_diary_user_date ON diary_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_aulas_topic ON aulas(topic);
CREATE INDEX IF NOT EXISTS idx_material_progress_user ON material_progress(user_id);

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Profiles: usuário vê próprio perfil; admins veem todos; ranking precisa ver todos members
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_select_members_ranking" ON profiles FOR SELECT USING (role = 'member');
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Meetings: qualquer usuário autenticado pode ver; apenas admins inserem/editam
CREATE POLICY "meetings_select_all" ON meetings FOR SELECT USING (auth.role() = 'authenticated');

-- Mission progress: usuário só vê/edita os próprios
CREATE POLICY "mission_progress_all_own" ON mission_progress FOR ALL USING (auth.uid() = user_id);

-- Material progress: usuário só vê/edita os próprios
CREATE POLICY "material_progress_all_own" ON material_progress FOR ALL USING (auth.uid() = user_id);

-- Diary entries: usuário só vê/edita os próprios
CREATE POLICY "diary_entries_all_own" ON diary_entries FOR ALL USING (auth.uid() = user_id);

-- Sales: usuário só vê/edita os próprios
CREATE POLICY "sales_all_own" ON sales FOR ALL USING (auth.uid() = user_id);

-- Levels e missions: leitura pública (dados de configuração)
ALTER TABLE levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE aulas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "levels_select_all" ON levels FOR SELECT USING (true);
CREATE POLICY "missions_select_all" ON missions FOR SELECT USING (true);
CREATE POLICY "aulas_select_all" ON aulas FOR SELECT USING (true);

-- Trigger para criar profile ao registrar usuário (opcional)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name', NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
