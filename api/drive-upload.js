const { google } = require('googleapis');
const Busboy = require('busboy');
const { Readable } = require('stream');

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  // Normaliza a chave privada — remove aspas extras e converte \n escapado em quebras reais
  const rawKey = (process.env.GOOGLE_PRIVATE_KEY || '')
    .replace(/^"([\s\S]*)"$/, '$1')  // remove aspas externas se existirem
    .replace(/\\n/g, '\n');           // converte \n literal em newline real

  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: rawKey,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  const drive = google.drive({ version: 'v3', auth: auth });

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
