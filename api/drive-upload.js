const { google } = require('googleapis');
const Busboy = require('busboy');
const { Readable } = require('stream');

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const MAX_FILES = 15;
const MAX_SIZE = 100 * 1024 * 1024; // 100MB

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const folderId = stripWrappingQuotes((process.env.GOOGLE_DRIVE_FOLDER_ID || '').trim());

  let auth;
  try {
    auth = buildGoogleAuth(req);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const drive = google.drive({ version: 'v3', auth });

  return new Promise((resolve) => {
    const bb = Busboy({ headers: req.headers });

    let files = [];
    let userName = 'Membro';
    let tooManyFiles = false;

    bb.on('field', (name, val) => {
      if (name === 'userName') userName = val.trim();
    });

    bb.on('file', (_name, file, info) => {
      if (files.length >= MAX_FILES) {
        tooManyFiles = true;
        file.resume();
        return;
      }

      const originalName = info.filename || 'upload';
      const mimeType = info.mimeType || 'application/octet-stream';

      let size = 0;
      let tooLarge = false;
      const chunks = [];

      file.on('data', (chunk) => {
        size += chunk.length;
        if (size > MAX_SIZE) tooLarge = true;
        chunks.push(chunk);
      });

      file.on('end', () => {
        files.push({ originalName, mimeType, chunks, size, tooLarge });
      });
    });

    bb.on('finish', async () => {
      if (tooManyFiles) {
        res.status(400).json({ error: 'Limite excedido: máximo de 15 arquivos por envio' });
        return resolve();
      }

      if (!files.length) {
        res.status(400).json({ error: 'Nenhum arquivo enviado' });
        return resolve();
      }

      const oversized = files.filter((f) => f.tooLarge || f.size > MAX_SIZE);
      if (oversized.length) {
        res.status(400).json({ error: 'Cada arquivo deve ter no máximo 100MB' });
        return resolve();
      }

      try {
        const date = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
        const uploaded = [];

        for (const f of files) {
          const finalName = `[${date}] ${userName} - ${f.originalName}`;
          const requestBody = { name: finalName };
          if (folderId) requestBody.parents = [folderId];

          const response = await drive.files.create({
            requestBody,
            media: {
              mimeType: f.mimeType,
              body: Readable.from(Buffer.concat(f.chunks)),
            },
            fields: 'id,webViewLink',
            supportsAllDrives: true,
          });

          uploaded.push({
            fileName: finalName,
            link: response.data.webViewLink,
            id: response.data.id,
          });
        }

        res.status(200).json({
          success: true,
          files: uploaded,
        });
      } catch (err) {
        console.error('Drive upload error:', err);
        res.status(500).json({ error: err.message });
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
  const credentialsRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!credentialsRaw) {
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

    throw new Error(
      'Configuração ausente: defina GOOGLE_SERVICE_ACCOUNT_JSON ou credenciais OAuth',
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


