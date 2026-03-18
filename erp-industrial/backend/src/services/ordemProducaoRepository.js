import { pool } from '../database/pool.js';

export const ordemProducaoRepository = {
  // 🔥 Criar ordem de produção
  async create({ produtoId, quantidade }) {
    const { rows } = await pool.query(
      `INSERT INTO ordens_producao 
       (produto_id, quantidade, status)
       VALUES ($1, $2, 'pendente')
       RETURNING *`,
      [produtoId, quantidade],
    );

    return rows[0];
  },

  // 📋 Listar todas
  async list() {
    const { rows } = await pool.query(
      `SELECT op.*, p.nome AS produto_nome
       FROM ordens_producao op
       JOIN produtos p ON p.id = op.produto_id
       ORDER BY op.id DESC`,
    );

    return rows;
  },

  // 🔍 Buscar por ID
  async getById(id) {
    const { rows } = await pool.query(
      `SELECT * FROM ordens_producao WHERE id = $1`,
      [id],
    );

    return rows[0];
  },

  // 🔄 Atualizar status
  async updateStatus(id, status) {
    const { rows } = await pool.query(
      `UPDATE ordens_producao
       SET status = $1
       WHERE id = $2
       RETURNING *`,
      [status, id],
    );

    return rows[0];
  },

  // 📦 Buscar OPs por status (útil pro dashboard)
  async getByStatus(status) {
    const { rows } = await pool.query(
      `SELECT op.*, p.nome AS produto_nome
       FROM ordens_producao op
       JOIN produtos p ON p.id = op.produto_id
       WHERE op.status = $1
       ORDER BY op.id DESC`,
      [status],
    );

    return rows;
  },
};
