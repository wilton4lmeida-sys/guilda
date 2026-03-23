-- ═══════════════════════════════════════════════════════════════
-- SEED — Dados iniciais (opcional)
-- Execute após 001_initial_schema.sql
-- ═══════════════════════════════════════════════════════════════

-- Níveis (compatível com LEVELS do dashboard)
INSERT INTO levels (level, name, min_xp, max_xp, emoji, commission_info, meta_text) VALUES
(1, 'Prospector', 0,     1000,   '🥉', '7%',          '2 vendas acumuladas'),
(2, 'Captador',   1001,  5000,   '🥈', '9%',          '6 vendas acumuladas'),
(3, 'Parceiro',   5001,  15000,  '🥇', '9% + Bônus',  '15 vendas acumuladas'),
(4, 'Elite',      15001, 30000,  '💎', '12%',          'Média >15 vendas/mês'),
(5, 'Consultor',  30001, 50000,  '⭐', '15%+',         'Histórico + aprovação liderança'),
(6, 'Franqueado', 50001, NULL,   '👑', 'Lucro operação','Todos os milestones')
ON CONFLICT (level) DO NOTHING;

-- Arsenal (aulas) — amostra
INSERT INTO aulas (id, topic, title, type, xp_reward, min_level, order_index) VALUES
(101, 'Prospecção', 'Introdução ao SPICED Framework', 'video', 50, 0, 1),
(102, 'Prospecção', 'Entendendo a Oferta Rugido', 'video', 50, 0, 2),
(103, 'Prospecção', 'Script de Abordagem — Abertura Fria', 'script', 40, 0, 3),
(104, 'Prospecção', 'Checklist de Prospecção Diária', 'template', 30, 0, 4),
(105, 'Prospecção', 'Como Qualificar um Lead pelo SPICED', 'pdf', 60, 1, 5),
(201, 'Follow-up', 'Sequência de Follow-up em 7 Dias', 'template', 60, 0, 1),
(202, 'Follow-up', 'Scripts de Follow-up por Canal', 'script', 50, 0, 2),
(301, 'Reunião', 'Como Marcar Reunião com Decisor', 'video', 60, 0, 1),
(302, 'Reunião', 'Script de Abertura de Reunião', 'script', 50, 0, 2)
ON CONFLICT (id) DO NOTHING;

-- Missões (amostra ativa) — execute uma vez; se já houver missões, pule este bloco
INSERT INTO missions (title, description, category, tipo, xp_reward, min_level, active) VALUES
('10 Ligações com SPICED', 'Realize no mínimo 10 ligações aplicando o framework SPICED. Registre no diário ao final do dia.', 'Diária', 'Prática', 30, 0, true),
('Report de Áudio Diário', 'Grave e envie o áudio de report: o que fez, o que vai fazer, principais obstáculos.', 'Diária', 'Execução', 20, 0, true),
('50 Ligações na Semana', 'Meta de volume semanal. Cada ligação precisa estar registrada no diário com data e resultado.', 'Semanal', 'Volume', 150, 0, true),
('3 Reuniões Marcadas', 'Marque 3 reuniões válidas e validadas pelo líder. Registre data, horário e empresa no diário.', 'Semanal', 'Resultado', 200, 0, true);
