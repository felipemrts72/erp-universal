import { pool } from '../database/pool.js';

export const producaoRepository = {
  async createOrdem({ produtoId, quantidade, status = 'pendente' }) {
    const { rows } = await pool.query(
      `INSERT INTO ordens_producao (produto_id, quantidade, status)
       VALUES ($1,$2,$3)
       RETURNING *`,
      [produtoId, quantidade, status]
    );
    return rows[0];
  },

  async getById(id) {
    const { rows } = await pool.query('SELECT * FROM ordens_producao WHERE id=$1', [id]);
    return rows[0];
  },

  async updateStatus(id, status) {
    const { rows } = await pool.query(
      'UPDATE ordens_producao SET status=$1 WHERE id=$2 RETURNING *',
      [status, id]
    );
    return rows[0];
  },

  async list() {
    const { rows } = await pool.query(
      `SELECT op.*, p.nome AS produto_nome
       FROM ordens_producao op
       INNER JOIN produtos p ON p.id = op.produto_id
       ORDER BY op.id DESC`
    );
    return rows;
  }
};
