const { google } = require('googleapis');
const Busboy = require('busboy');
const { Readable } = require('stream');

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  // Reformata a chave PEM com quebras de linha a cada 64 chars (exigido pelo OpenSSL 3)
  function formatPemKey(raw) {
    let key = raw || '';
    if (key.startsWith('"') && key.endsWith('"')) key = key.slice(1, -1);
    key = key.replace(/\\n/g, '\n').replace(/\r\n/g, '\n').trim();

    const header = '-----BEGIN PRIVATE KEY-----';
    const footer = '-----END PRIVATE KEY-----';

    // Extrai apenas o corpo base64, remove todo espaço/newline do meio
    const body = key
      .replace(header, '')
      .replace(footer, '')
      .replace(/\s+/g, '');

    // Re-envolve em linhas de 64 chars (formato PEM padrão)
    const wrapped = (body.match(/.{1,64}/g) || []).join('\n');
    return `${header}\n${wrapped}\n${footer}\n`;
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: formatPemKey(process.env.GOOGLE_PRIVATE_KEY),
    },
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  const drive = google.drive({ version: 'v3', auth });

  return new Promise((resolve) => {
    const bb = Busboy({ headers: req.headers });

    let fileName  = 'upload';
    let mimeType  = 'application/octet-stream';
    let chunks    = [];
    let userName  = 'Membro';
    let fileFound = false;

    bb.on('field', (name, val) => {
      if (name === 'userName') userName = val.trim();
    });

    bb.on('file', (_name, file, info) => {
      fileFound = true;
      fileName  = info.filename || 'upload';
      mimeType  = info.mimeType || 'application/octet-stream';
      file.on('data', (chunk) => chunks.push(chunk));
    });

    bb.on('finish', async () => {
      if (!fileFound) {
        res.status(400).json({ error: 'Nenhum arquivo enviado' });
        return resolve();
      }

      try {
        const buffer = Buffer.concat(chunks);
        const date   = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
        const finalName = `[${date}] ${userName} - ${fileName}`;

        const response = await drive.files.create({
          requestBody: {
            name: finalName,
            parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
          },
          media: {
            mimeType,
            body: Readable.from(buffer),
          },
          fields: 'id,webViewLink',
        });

        res.status(200).json({
          success: true,
          fileName: finalName,
          link: response.data.webViewLink,
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
