# Supabase — Guilda Repo

## Setup

1. No painel do Supabase, vá em **SQL Editor**
2. Execute o conteúdo de `migrations/001_initial_schema.sql`
3. (Opcional) Execute `migrations/002_seed_demo.sql` para popular dados iniciais

## Mapa UI → Dados

| Bloco da Dashboard | Tabela(s) | Campos principais |
|--------------------|-----------|-------------------|
| Herói / Perfil     | `profiles` | id, name, xp, avatar_url, role |
| Ranking            | `profiles` | id, name, xp (role='member', order by xp desc) |
| Encontros          | `meetings` | user_id, title, date, location, confirmed, min_level |
| Missões            | `missions`, `mission_progress` | title, description, category, xp_reward, week_start, week_end |
| Arsenal            | `aulas`, `material_progress` | topic, title, type, xp_reward, min_level |
| Funil              | `diary_entries` | contatos_tentados, ligacoes_atendidas, conexao_decisor, reunioes_marcadas |
| Diário             | `diary_entries` | date, contatos_tentados, ligacoes_atendidas, etc. |

## RLS

- **profiles**: usuário vê próprio perfil; todos veem members (para ranking)
- **meetings, mission_progress, material_progress, diary_entries, sales**: apenas próprios registros
- **levels, missions, aulas**: leitura pública (configuração)
