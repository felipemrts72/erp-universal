import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { httpError } from './httpError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function salvarBase64(base64, pasta) {
  const match = base64.match(/^data:(.+);base64,(.+)$/);

  if (!match) {
    throw httpError('Imagem inválida');
  }

  const mimeType = match[1];
  const extensao = mimeType.includes('png') ? 'png' : 'jpg';
  const nomeArquivo = `${pasta}-${Date.now()}.${extensao}`;

  const diretorio = path.join(__dirname, `../../uploads/${pasta}`);

  if (!fs.existsSync(diretorio)) {
    fs.mkdirSync(diretorio, { recursive: true });
  }

  const caminhoArquivo = path.join(diretorio, nomeArquivo);
  fs.writeFileSync(caminhoArquivo, Buffer.from(match[2], 'base64'));

  return `/uploads/${pasta}/${nomeArquivo}`;
}
