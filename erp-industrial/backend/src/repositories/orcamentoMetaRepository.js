import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const filePath = path.join(__dirname, '../data/orcamento_meta.json');

function readAll() {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function writeAll(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export const orcamentoMetaRepository = {
  async salvarNomeCustomizado(itemOrcamentoId, nomeCustomizado) {
    const db = readAll();
    db[itemOrcamentoId] = { ...(db[itemOrcamentoId] || {}), nome_customizado: nomeCustomizado };
    writeAll(db);
  },

  async mapearNomes(itemIds) {
    const db = readAll();
    return itemIds.reduce((acc, id) => {
      acc[id] = db[id]?.nome_customizado || null;
      return acc;
    }, {});
  }
};
