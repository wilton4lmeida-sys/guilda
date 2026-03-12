const { google } = require('googleapis');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });

  const oauthClientId = stripWrappingQuotes((process.env.GOOGLE_OAUTH_CLIENT_ID || '').trim());
  const oauthClientSecret = stripWrappingQuotes((process.env.GOOGLE_OAUTH_CLIENT_SECRET || '').trim());
  const oauthRefreshToken = stripWrappingQuotes((process.env.GOOGLE_OAUTH_REFRESH_TOKEN || '').trim());
  const folderId = stripWrappingQuotes((process.env.GOOGLE_DRIVE_FOLDER_ID || '').trim());

  if (!oauthClientId || !oauthClientSecret || !oauthRefreshToken) {
    return res.status(500).json({ error: 'OAuth não configurado' });
  }
  if (!folderId) {
    return res.status(500).json({ error: 'GOOGLE_DRIVE_FOLDER_ID ausente' });
  }

  const oauth = new google.auth.OAuth2(
    oauthClientId,
    oauthClientSecret,
    getRedirectUri(req),
  );
  oauth.setCredentials({ refresh_token: oauthRefreshToken });

  try {
    const { token } = await oauth.getAccessToken();
    if (!token) return res.status(500).json({ error: 'Falha ao gerar access token' });
    return res.status(200).json({ access_token: token, folder_id: folderId });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Falha ao gerar access token' });
  }
};

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
