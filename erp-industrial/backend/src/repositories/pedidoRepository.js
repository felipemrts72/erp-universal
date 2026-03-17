import { pool } from '../database/pool.js';

export const pedidoRepository = {
  async createFromOrcamento(orcamento, itens) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const pedido = await client.query(
        `INSERT INTO pedidos (orcamento_id, cliente_nome)
         VALUES ($1,$2)
         RETURNING *`,
        [orcamento.id, orcamento.cliente_nome]
      );
      for (const item of itens) {
        await client.query(
          `INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario)
           VALUES ($1,$2,$3,$4)`,
          [pedido.rows[0].id, item.produto_id, item.quantidade, item.preco_unitario]
        );
      }
      await client.query('COMMIT');
      return pedido.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async list() {
    const { rows } = await pool.query('SELECT * FROM pedidos ORDER BY id DESC');
    return rows;
  }
};
