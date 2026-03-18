import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const filePath = path.join(__dirname, '../data/auditoria_estoque.json');

function readAll() {
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function writeAll(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export const auditoriaRepository = {
  async registrarAuditoria(payload) {
    const atual = readAll();
    const novo = {
      id: atual.length + 1,
      criado_em: new Date().toISOString(),
      ...payload
    };
    atual.push(novo);
    writeAll(atual);
    return novo;
  },

  async listarPorOrdem(ordemProducaoId) {
    return readAll().filter((item) => Number(item.ordem_producao_id) === Number(ordemProducaoId));
  }
};
