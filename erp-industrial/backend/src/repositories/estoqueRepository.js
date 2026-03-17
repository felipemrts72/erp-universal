import { pool } from '../database/pool.js';

export const estoqueRepository = {
  async addMovimento({ produtoId, quantidade, tipoMovimento, referenciaTipo, referenciaId }) {
    const { rows } = await pool.query(
      `INSERT INTO movimentos_estoque (produto_id, quantidade, tipo_movimento, referencia_tipo, referencia_id)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [produtoId, quantidade, tipoMovimento, referenciaTipo || null, referenciaId || null]
    );
    return rows[0];
  },

  async saldoPorProduto(produtoId) {
    const { rows } = await pool.query(
      'SELECT COALESCE(SUM(quantidade),0) AS saldo FROM movimentos_estoque WHERE produto_id = $1',
      [produtoId]
    );
    return Number(rows[0].saldo);
  },

  async listMovimentos() {
    const { rows } = await pool.query(
      `SELECT m.*, p.nome AS produto_nome
       FROM movimentos_estoque m
       INNER JOIN produtos p ON p.id = m.produto_id
       ORDER BY m.criado_em DESC`
    );
    return rows;
  }
};
