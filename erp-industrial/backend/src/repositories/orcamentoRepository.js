import { pool } from '../database/pool.js';

export const orcamentoRepository = {
  async create({ clienteNome, itens }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const orcamento = await client.query(
        `INSERT INTO orcamentos (cliente_nome) VALUES ($1) RETURNING *`,
        [clienteNome]
      );
      for (const item of itens) {
        await client.query(
          `INSERT INTO itens_orcamento (orcamento_id, produto_id, quantidade, preco_unitario)
           VALUES ($1,$2,$3,$4)`,
          [orcamento.rows[0].id, item.produtoId, item.quantidade, item.precoUnitario]
        );
      }
      await client.query('COMMIT');
      return orcamento.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async list() {
    const { rows } = await pool.query('SELECT * FROM orcamentos ORDER BY id DESC');
    return rows;
  },

  async getWithItens(id) {
    const { rows } = await pool.query('SELECT * FROM orcamentos WHERE id=$1', [id]);
    if (!rows[0]) return null;
    const itens = await pool.query('SELECT * FROM itens_orcamento WHERE orcamento_id=$1', [id]);
    return { ...rows[0], itens: itens.rows };
  },

  async updateStatus(id, status) {
    const { rows } = await pool.query(
      'UPDATE orcamentos SET status=$1 WHERE id=$2 RETURNING *',
      [status, id]
    );
    return rows[0];
  }
};
