import { pool } from '../database/pool.js';

export const relatorioRepository = {
  async create({ ordemProducaoId, nomeFuncionario, descricao, fotoUrl, assinaturaUrl }) {
    const { rows } = await pool.query(
      `INSERT INTO relatorios_producao (ordem_producao_id, nome_funcionario, descricao, foto_url, assinatura_url)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [ordemProducaoId, nomeFuncionario, descricao, fotoUrl || null, assinaturaUrl || null]
    );
    return rows[0];
  },

  async list() {
    const { rows } = await pool.query(
      `SELECT r.*, op.produto_id
       FROM relatorios_producao r
       INNER JOIN ordens_producao op ON op.id = r.ordem_producao_id
       ORDER BY r.id DESC`
    );
    return rows;
  }
};
