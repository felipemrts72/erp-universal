import { pool } from '../database/pool.js';

export const entregaRepository = {
  async listarPendentes() {
    const { rows } = await pool.query(`
      SELECT e.*, p.nome AS produto_nome
      FROM entregas e
      JOIN produtos p ON p.id = e.produto_id
      WHERE e.status = 'pendente'
      ORDER BY e.criado_em ASC
    `);

    return rows;
  },

  async listarTodas() {
    const { rows } = await pool.query(`
      SELECT e.*, p.nome AS produto_nome
      FROM entregas e
      JOIN produtos p ON p.id = e.produto_id
      ORDER BY e.criado_em DESC
    `);

    return rows;
  },

  async criar(data, client = pool) {
    const { ordem_producao_id, pedido_id, produto_id, quantidade, criado_por } =
      data;

    const { rows } = await client.query(
      `INSERT INTO entregas
       (ordem_producao_id, pedido_id, produto_id, quantidade, status, criado_por)
       VALUES ($1,$2,$3,$4,'pendente',$5)
       RETURNING *`,
      [ordem_producao_id, pedido_id, produto_id, quantidade, criado_por],
    );

    return rows[0];
  },

  async entregar(id, usuario_id, tipo) {
    const { rows } = await pool.query(
      `UPDATE entregas
       SET status = 'entregue',
           entregue_em = NOW(),
           usuario_id = $2,
           tipo = $3
       WHERE id = $1 AND status = 'pendente'
       RETURNING *`,
      [id, usuario_id, tipo],
    );

    return rows[0];
  },
};
