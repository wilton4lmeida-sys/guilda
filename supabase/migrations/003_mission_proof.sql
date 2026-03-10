-- ── MISSIONS: comprovacao de missão ──
ALTER TABLE missions ADD COLUMN IF NOT EXISTS proof_required BOOLEAN DEFAULT false;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS drive_folder_id TEXT;
