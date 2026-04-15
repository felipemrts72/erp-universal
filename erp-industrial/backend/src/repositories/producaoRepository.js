import { pool } from '../database/pool.js';

export const producaoRepository = {
  async createOrdem({
    produtoId,
    vendaId = null,
    quantidade,
    status = 'pendente',
  }) {
    const { rows } = await pool.query(
      `INSERT INTO ordens_producao (produto_id, venda_id, quantidade, status)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [produtoId, vendaId, quantidade, status],
    );

    return rows[0];
  },

  async getById(id) {
    const { rows } = await pool.query(
      `SELECT
         op.*,
         p.nome AS produto_nome,
         v.cliente_nome
       FROM ordens_producao op
       INNER JOIN produtos p ON p.id = op.produto_id
       LEFT JOIN vendas v ON v.id = op.venda_id
       WHERE op.id = $1`,
      [id],
    );

    return rows[0] || null;
  },

  async getByIdWithClient(id, client) {
    const { rows } = await client.query(
      `SELECT
         op.*,
         p.nome AS produto_nome
       FROM ordens_producao op
       INNER JOIN produtos p ON p.id = op.produto_id
       WHERE op.id = $1`,
      [id],
    );

    return rows[0] || null;
  },

  async updateStatus(id, status, client = pool) {
    const { rows } = await client.query(
      `UPDATE ordens_producao
       SET status = $1
       WHERE id = $2
       RETURNING *`,
      [status, id],
    );

    return rows[0] || null;
  },

  async list() {
    const { rows } = await pool.query(
      `SELECT
         op.*,
         p.nome AS produto_nome,
         v.cliente_nome
       FROM ordens_producao op
       INNER JOIN produtos p ON p.id = op.produto_id
       LEFT JOIN vendas v ON v.id = op.venda_id
       ORDER BY
         CASE
           WHEN op.status = 'em_producao' THEN 1
           WHEN op.status = 'pendente' THEN 2
           WHEN op.status = 'finalizado' THEN 3
           ELSE 4
         END,
         op.id DESC`,
    );

    return rows;
  },

  async finalizar(id, client = pool) {
    const { rows } = await client.query(
      `UPDATE ordens_producao
       SET status = 'finalizado'
       WHERE id = $1
       RETURNING *`,
      [id],
    );

    return rows[0] || null;
  },

  async existeOrdemAbertaPorProduto(produtoId, client = pool) {
    const { rows } = await client.query(
      `
    SELECT 1
    FROM ordens_producao
    WHERE produto_id = $1
      AND status IN ('pendente', 'em_producao')
    LIMIT 1
    `,
      [produtoId],
    );

    return !!rows.length;
  },
};
