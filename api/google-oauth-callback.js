const { google } = require('googleapis');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const clientId = stripWrappingQuotes((process.env.GOOGLE_OAUTH_CLIENT_ID || '').trim());
  const clientSecret = stripWrappingQuotes((process.env.GOOGLE_OAUTH_CLIENT_SECRET || '').trim());

  if (!clientId || !clientSecret) {
    return res.status(500).send('Defina GOOGLE_OAUTH_CLIENT_ID e GOOGLE_OAUTH_CLIENT_SECRET.');
  }

  const currentUrl = new URL(req.url, getBaseUrl(req));
  const code = currentUrl.searchParams.get('code');
  const error = currentUrl.searchParams.get('error');

  if (error) {
    return res.status(400).send(`OAuth cancelado ou com erro: ${escapeHtml(error)}`);
  }

  if (!code) {
    return res.status(400).send('Código OAuth ausente. Inicie por /api/google-oauth-start.');
  }

  const oauth = new google.auth.OAuth2(clientId, clientSecret, getRedirectUri(req));

  try {
    const { tokens } = await oauth.getToken(code);
    const refreshToken = tokens.refresh_token || '';

    if (!refreshToken) {
      return res.status(200).send(`
        <h2>Autorização concluída, mas sem refresh token</h2>
        <p>Remova o app autorizado da sua conta Google e tente novamente para forçar novo consentimento.</p>
        <p><a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener">Abrir permissões da conta Google</a></p>
      `);
    }

    return res.status(200).send(`
      <h2>Refresh token gerado com sucesso</h2>
      <p>Copie o valor abaixo e salve em <code>GOOGLE_OAUTH_REFRESH_TOKEN</code> na Vercel:</p>
      <textarea style="width:100%;min-height:120px">${escapeHtml(refreshToken)}</textarea>
      <p>Depois, faça novo deploy e teste o upload no formulário.</p>
    `);
  } catch (err) {
    const details = err && err.response && err.response.data
      ? JSON.stringify(err.response.data)
      : (err && err.message ? err.message : 'erro desconhecido');
    return res.status(500).send(`Falha ao trocar código por token: ${escapeHtml(details)}`);
  }
};

function getRedirectUri(req) {
  const explicit = stripWrappingQuotes((process.env.GOOGLE_OAUTH_REDIRECT_URI || '').trim());
  if (explicit) return explicit;

  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}/api/google-oauth-callback`;
}

function getBaseUrl(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}`;
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

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
