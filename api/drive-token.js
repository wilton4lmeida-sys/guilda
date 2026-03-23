const { google } = require('googleapis');

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const folderId = stripWrappingQuotes((process.env.GOOGLE_DRIVE_FOLDER_ID || '').trim());

  let auth;
  try {
    auth = buildGoogleAuth(req);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  try {
    const tokenResponse = await auth.getAccessToken();
    const accessToken = tokenResponse?.token || tokenResponse;

    if (!accessToken) {
      return res.status(500).json({ error: 'Falha ao obter access token' });
    }

    return res.status(200).json({ accessToken, folderId });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

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
