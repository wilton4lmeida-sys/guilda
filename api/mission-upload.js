const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');
const Busboy = require('busboy');
const { PassThrough } = require('stream');
const path = require('path');

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const MAX_FILES = 5;
const MAX_SIZE = 100 * 1024 * 1024; // 100MB

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const missionId = (req.query?.missionId || '').toString().trim();
  if (!missionId) {
    return res.status(400).json({ error: 'missionId ausente' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Configuração Supabase ausente (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY)' });
  }

  const missionsRoot = stripWrappingQuotes((process.env.GOOGLE_DRIVE_MISSIONS_FOLDER_ID || '').trim())
    || stripWrappingQuotes((process.env.GOOGLE_DRIVE_FOLDER_ID || '').trim());

  if (!missionsRoot) {
    return res.status(500).json({ error: 'Variavel GOOGLE_DRIVE_MISSIONS_FOLDER_ID ausente' });
  }

  let auth;
  try {
    auth = buildGoogleAuth(req);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const drive = google.drive({ version: 'v3', auth });
  const sb = createClient(supabaseUrl, supabaseServiceKey);

  const { data: mission, error: missionError } = await sb
    .from('missions')
    .select('id,title,drive_folder_id,proof_required')
    .eq('id', missionId)
    .single();

  if (missionError || !mission) {
    return res.status(404).json({ error: 'Missão não encontrada' });
  }

  if (!mission.proof_required) {
    return res.status(400).json({ error: 'Missão não exige comprovacão' });
  }

  let folderId = mission.drive_folder_id;
  if (!folderId) {
    const folderName = `Missao - ${mission.title || mission.id}`;
    const folderRes = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [missionsRoot],
      },
      fields: 'id',
      supportsAllDrives: true,
    });

    folderId = folderRes.data.id;
    await sb.from('missions').update({ drive_folder_id: folderId }).eq('id', mission.id);
  }

  return new Promise((resolve) => {
    const bb = Busboy({
      headers: req.headers,
      limits: { files: MAX_FILES, fileSize: MAX_SIZE },
    });

    let userName = 'Membro';
    let userWhatsapp = '';
    let fileCount = 0;
    let tooMany = false;
    let tooLarge = false;
    const uploadPromises = [];
    const uploaded = [];

    bb.on('field', (name, val) => {
      if (name === 'userName') userName = val.trim();
      if (name === 'userWhatsapp') userWhatsapp = val.trim();
    });

    bb.on('filesLimit', () => {
      tooMany = true;
    });

    bb.on('file', (_name, file, info) => {
      fileCount += 1;
      if (fileCount > MAX_FILES) {
        tooMany = true;
        file.resume();
        return;
      }

      const originalName = info.filename || 'upload';
      const mimeType = info.mimeType || 'application/octet-stream';
      let size = 0;
      const pass = new PassThrough();

      file.on('data', (chunk) => {
        size += chunk.length;
        if (size > MAX_SIZE) {
          tooLarge = true;
          pass.destroy(new Error('FILE_TOO_LARGE'));
          file.resume();
        }
      });

      file.on('limit', () => {
        tooLarge = true;
        pass.destroy(new Error('FILE_TOO_LARGE'));
      });

      file.pipe(pass);

      const safeName = normalizeLabel(userName) || 'SemNome';
      const safeWhats = normalizeLabel(userWhatsapp) || 'SemWhatsapp';
      const safeMission = normalizeLabel(mission.title || 'Missao');
      const ext = path.extname(originalName) || '';
      const finalName = `${safeName}-${safeWhats}-${safeMission}-${fileCount}${ext}`;

      const uploadPromise = drive.files.create({
        requestBody: {
          name: finalName,
          parents: [folderId],
        },
        media: {
          mimeType,
          body: pass,
        },
        fields: 'id,webViewLink',
        supportsAllDrives: true,
      }).then((response) => {
        uploaded.push({
          fileName: finalName,
          link: response.data.webViewLink,
          id: response.data.id,
        });
      }).catch((err) => {
        console.error('Mission upload error:', err);
        throw err;
      });

      uploadPromises.push(uploadPromise);
    });

    bb.on('finish', async () => {
      if (tooMany) {
        res.status(400).json({ error: 'Limite excedido: máximo de 5 arquivos por missão' });
        return resolve();
      }

      if (!fileCount) {
        res.status(400).json({ error: 'Nenhum arquivo enviado' });
        return resolve();
      }

      if (!userWhatsapp) {
        res.status(400).json({ error: 'WhatsApp é obrigatório' });
        return resolve();
      }

      if (tooLarge) {
        res.status(400).json({ error: 'Cada arquivo deve ter no máximo 100MB' });
        return resolve();
      }

      try {
        await Promise.all(uploadPromises);
        res.status(200).json({ success: true, files: uploaded });
      } catch (err) {
        res.status(500).json({ error: err.message || 'Falha no upload' });
      }

      resolve();
    });

    bb.on('error', (err) => {
      res.status(500).json({ error: err.message });
      resolve();
    });

    req.pipe(bb);
  });
}

handler.config = { api: { bodyParser: false } };
module.exports = handler;

function buildGoogleAuth(req) {
  const oauthClientId = stripWrappingQuotes((process.env.GOOGLE_OAUTH_CLIENT_ID || '').trim());
  const oauthClientSecret = stripWrappingQuotes((process.env.GOOGLE_OAUTH_CLIENT_SECRET || '').trim());
  const oauthRefreshToken = stripWrappingQuotes((process.env.GOOGLE_OAUTH_REFRESH_TOKEN || '').trim());

  if (oauthClientId && oauthClientSecret && oauthRefreshToken) {
    const oauth = new google.auth.OAuth2(
      oauthClientId,
      oauthClientSecret,
      getRedirectUri(req),
    );
    oauth.setCredentials({ refresh_token: oauthRefreshToken });
    return oauth;
  }

  const credentialsRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!credentialsRaw) {
    throw new Error(
      'Configuração ausente: defina GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET e GOOGLE_OAUTH_REFRESH_TOKEN',
    );
  }

  let credentials;
  try {
    credentials = parseServiceAccount(credentialsRaw);
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON inválido ou ausente');
  }

  if (credentials.private_key) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
  }

  if (!credentials.client_email || !credentials.private_key) {
    throw new Error('Credenciais incompletas: client_email/private_key ausentes');
  }

  return new google.auth.GoogleAuth({
    credentials,
    scopes: [DRIVE_SCOPE],
  });
}

function getRedirectUri(req) {
  const explicit = stripWrappingQuotes((process.env.GOOGLE_OAUTH_REDIRECT_URI || '').trim());
  if (explicit) return explicit;

  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}/api/google-oauth-callback`;
}

function stripWrappingQuotes(value) {
  if (!value) return value;
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function parseServiceAccount(raw) {
  const trimmed = (raw || '').trim();
  const variants = [trimmed, stripWrappingQuotes(trimmed)];

  for (const candidate of variants) {
    if (!candidate) continue;

    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object') return parsed;
      if (typeof parsed === 'string') {
        const parsedTwice = JSON.parse(parsed);
        if (parsedTwice && typeof parsedTwice === 'object') return parsedTwice;
      }
    } catch {
      // tenta proxima variante
    }
  }

  throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_JSON');
}

function normalizeLabel(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9-_]/g, '');
}
