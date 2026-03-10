const { google } = require('googleapis');

const SHEET_NAME = 'Diario';
const FILE_NAME = 'Diario - Guilda';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo nao permitido' });

  const oauthClientId = stripWrappingQuotes((process.env.GOOGLE_OAUTH_CLIENT_ID || '').trim());
  const oauthClientSecret = stripWrappingQuotes((process.env.GOOGLE_OAUTH_CLIENT_SECRET || '').trim());
  const oauthRefreshToken = stripWrappingQuotes((process.env.GOOGLE_OAUTH_REFRESH_TOKEN || '').trim());
  const folderId = stripWrappingQuotes((process.env.GOOGLE_SHEETS_FOLDER_ID || '').trim());

  if (!oauthClientId || !oauthClientSecret || !oauthRefreshToken) {
    return res.status(500).json({ error: 'OAuth nao configurado' });
  }
  if (!folderId) {
    return res.status(500).json({ error: 'GOOGLE_SHEETS_FOLDER_ID ausente' });
  }

  const payload = req.body || {};
  const date = String(payload.date || '');
  if (!date) return res.status(400).json({ error: 'Data ausente' });

  const userName = String(payload.user_name || '');
  const userEmail = String(payload.user_email || '');
  const userId = String(payload.user_id || '');

  const metrics = payload.metrics || {};

  const oauth = new google.auth.OAuth2(
    oauthClientId,
    oauthClientSecret,
    getRedirectUri(req),
  );
  oauth.setCredentials({ refresh_token: oauthRefreshToken });

  try {
    const drive = google.drive({ version: 'v3', auth: oauth });
    const sheets = google.sheets({ version: 'v4', auth: oauth });

    const sheetFileId = await getOrCreateSheetFile(drive, folderId);
    await ensureSheetTab(sheets, sheetFileId);
    await ensureHeaderRow(sheets, sheetFileId);

    const row = [
      date,
      userName,
      userEmail,
      userId,
      toInt(metrics.ligacoes_totais),
      toInt(metrics.conexoes),
      toInt(metrics.conexoes_decisor),
      toInt(metrics.reunioes_marcadas),
      toInt(metrics.reunioes_marcadas_sql),
      toInt(metrics.reunioes_realizadas),
      toInt(metrics.reunioes_realizadas_sql),
      toInt(metrics.reunioes_remarcadas),
      toInt(metrics.no_show),
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetFileId,
      range: `${SHEET_NAME}!A1`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] },
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Falha ao enviar para Sheets' });
  }
};

async function getOrCreateSheetFile(drive, folderId) {
  const q = `mimeType='application/vnd.google-apps.spreadsheet' and name='${FILE_NAME}' and '${folderId}' in parents and trashed=false`;
  const list = await drive.files.list({
    q,
    spaces: 'drive',
    fields: 'files(id, name)',
    pageSize: 1,
  });
  if (list.data.files && list.data.files.length > 0) {
    return list.data.files[0].id;
  }

  const created = await drive.files.create({
    requestBody: {
      name: FILE_NAME,
      mimeType: 'application/vnd.google-apps.spreadsheet',
      parents: [folderId],
    },
    fields: 'id',
  });

  return created.data.id;
}

async function ensureSheetTab(sheets, spreadsheetId) {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets(properties(title))',
  });
  const hasTab = (meta.data.sheets || []).some(s => s.properties && s.properties.title === SHEET_NAME);
  if (hasTab) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title: SHEET_NAME } } }],
    },
  });
}

async function ensureHeaderRow(sheets, spreadsheetId) {
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME}!A1:M1`,
  });
  if (existing.data.values && existing.data.values.length > 0) return;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET_NAME}!A1:M1`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[
        'Data',
        'Nome',
        'Email',
        'User ID',
        'Ligacoes totais',
        'Conexoes',
        'Conexoes com decisor',
        'Reunioes marcadas totais',
        'Reunioes marcadas SQL',
        'Reunioes realizadas totais',
        'Reunioes realizadas SQL',
        'Reunioes remarcadas',
        'No-Show',
      ]],
    },
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

function toInt(value) {
  const num = parseInt(value, 10);
  return Number.isFinite(num) ? num : 0;
}
