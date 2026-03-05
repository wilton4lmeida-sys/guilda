# GUILDA — PASSO A PASSO DE IMPLEMENTAÇÃO

---

## ETAPA 1: Configurar Supabase (5 minutos)

1. Acesse o painel do Supabase: https://supabase.com/dashboard
2. Entre no seu projeto
3. Vá em **SQL Editor** (menu lateral esquerdo)
4. Clique em **New Query**
5. Cole TODO o conteúdo do arquivo `guilda-setup.sql`
6. Clique em **Run** (ou Ctrl+Enter)
7. Deve aparecer "Success" — todas as tabelas e triggers foram criados

**Verificação:** Vá em **Table Editor** no menu lateral. Você deve ver 6 tabelas: `profiles`, `diary_entries`, `missions`, `mission_progress`, `meetings`, `meeting_attendance`.

---

## ETAPA 2: Pegar suas credenciais do Supabase (2 minutos)

1. No painel do Supabase, vá em **Settings** → **API**
2. Copie:
   - **Project URL** (ex: `https://abcdefgh.supabase.co`)
   - **anon/public key** (começa com `eyJ...`)
3. Esses dois valores precisam ser colados em TODOS os HTMLs

---

## ETAPA 3: Colocar as credenciais nos HTMLs (5 minutos)

Em TODOS os 9 arquivos HTML (index.html + 8 páginas internas), substitua:

```
https://SEU_PROJETO.supabase.co  →  sua URL real
SUA_ANON_KEY_AQUI               →  sua anon key real
```

**Arquivos para editar:**
- `index.html` (login — já está no GitHub)
- `dashboard.html`
- `arsenal.html`
- `missoes.html`
- `encontros.html`
- `diario.html`
- `metricas.html`
- `ranking.html`
- `painel-mestre.html`

**Dica:** Use "Find and Replace" (Ctrl+H) no VS Code para trocar em todos de uma vez.

---

## ETAPA 4: Definir o Wilton como Admin (2 minutos)

**Opção A — Se o Wilton já se cadastrou:**

1. Vá no Supabase → **SQL Editor**
2. Rode:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'EMAIL_DO_WILTON_AQUI';
```

**Opção B — Se o Wilton ainda não se cadastrou:**

1. Peça pro Wilton criar conta pela tela de login normalmente
2. Depois que ele criar, rode o SQL acima

**Resultado:** Quando o Wilton logar, ele vai ter acesso ao Painel Mestre. Todos os outros BDRs que se cadastrarem entram como `role = 'bdr'` automaticamente.

---

## ETAPA 5: Subir no GitHub (3 minutos)

1. Coloque os 8 arquivos HTML na mesma pasta do seu `index.html` no repositório
2. Faça commit e push
3. O Vercel atualiza automaticamente

---

## ETAPA 6: Testar (5 minutos)

1. Acesse sua URL do Vercel
2. Crie uma conta de teste pela tela de login
3. Confirme o e-mail
4. Faça login — deve ir pro `dashboard.html`
5. Verifique no Supabase → **Table Editor** → `profiles` se o usuário apareceu com level=1, xp=0, role=bdr
6. Rode o SQL pra tornar o Wilton admin
7. Logue como Wilton — deve ter acesso ao Painel Mestre

---

## COMO FUNCIONA DEPOIS DE TUDO PRONTO

### Novo BDR se cadastra:
1. Entra na tela de login → cria conta
2. Trigger do Supabase cria o profile automaticamente (xp=0, level=1, Recruta)
3. O cara aparece no Ranking com 0 XP
4. Aparece no Painel Mestre do admin na lista de membros

### BDR usa o Diário:
1. Todo dia, preenche: contatos tentados, ligações atendidas, conexão com decisor, reuniões marcadas
2. Dados salvam na tabela `diary_entries`
3. A aba "Minhas Métricas" puxa esses dados e calcula os totais da semana

### Admin cria Missão:
1. No Painel Mestre, clica "Nova Missão"
2. Define título, descrição, XP, categoria, prazo
3. Salva na tabela `missions`
4. Todos os BDRs veem a missão na aba "Missões"
5. Conforme completam, o admin marca como concluída
6. O XP é adicionado ao profile do BDR
7. Se o XP ultrapassar o limiar, o trigger `update_level` sobe o nível automaticamente

### Tabela de Níveis (XP necessário):
- **Nível 1 — Recruta:** 0 XP
- **Nível 2 — Escudeiro:** 400 XP
- **Nível 3 — Guerreiro:** 1.000 XP
- **Nível 4 — Caçador:** 2.000 XP
- **Nível 5 — Comandante:** 3.000 XP
- **Nível 6 — Mestre:** 4.000 XP
- **Nível 7 — Lorde:** 5.000 XP

---

## PRÓXIMOS PASSOS (depois de tudo funcionando)

Estas etapas são pra conectar cada HTML com o banco de verdade (dados dinâmicos em vez de estáticos):

1. **Dashboard** — puxar nome, XP, nível, métricas da semana, missões ativas
2. **Diário** — salvar no Supabase em vez de localStorage
3. **Ranking** — query em profiles ordenado por XP
4. **Missões** — listar da tabela missions + mission_progress
5. **Encontros** — listar da tabela meetings
6. **Métricas** — agregar diary_entries por semana
7. **Painel Mestre** — CRUD de missões, encontros, membros

Cada um desses é um script JS que faz query no Supabase e popula o HTML. A gente pode fazer um por um.
