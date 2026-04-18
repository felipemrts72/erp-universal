import multer from 'multer';
import fs from 'fs';
import path from 'path';

function garantirPasta(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function resolverSubpasta(req, file) {
  const url = req.originalUrl || '';

  if (url.includes('/relatorios-producao')) {
    return 'relatorios-producao';
  }

  if (url.includes('/entregas')) {
    return 'entregas';
  }

  return 'geral';
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const baseDir = process.env.UPLOAD_DIR || 'uploads';
    const subpasta = resolverSubpasta(req, file);
    const destinoFinal = path.join(baseDir, subpasta);

    garantirPasta(destinoFinal);
    cb(null, destinoFinal);
  },

  filename: (req, file, cb) => {
    const nomeSeguro = String(file.originalname || 'arquivo')
      .replace(/\s+/g, '_')
      .replace(/[^\w.\-]/g, '');

    cb(null, `${Date.now()}-${nomeSeguro}`);
  },
});

export const upload = multer({ storage });
