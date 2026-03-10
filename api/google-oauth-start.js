const { google } = require('googleapis');

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const clientId = stripWrappingQuotes((process.env.GOOGLE_OAUTH_CLIENT_ID || '').trim());
  const clientSecret = stripWrappingQuotes((process.env.GOOGLE_OAUTH_CLIENT_SECRET || '').trim());

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Defina GOOGLE_OAUTH_CLIENT_ID e GOOGLE_OAUTH_CLIENT_SECRET' });
  }

  const oauth = new google.auth.OAuth2(clientId, clientSecret, getRedirectUri(req));
  const authUrl = oauth.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [DRIVE_SCOPE],
    include_granted_scopes: true,
  });

  return res.status(200).json({
    ok: true,
    authUrl,
    redirectUri: getRedirectUri(req),
  });
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
