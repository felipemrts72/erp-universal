import { pool } from '../database/pool.js';

export const vendaRepository = {
  async createFromOrcamento(orcamento, itens) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const venda = await client.query(
        `INSERT INTO vendas (orcamento_id, cliente_id, cliente_nome)
         VALUES ($1,$2,$3)
         RETURNING *`,
        [orcamento.id, orcamento.cliente_id || null, orcamento.cliente_nome],
      );

      for (const item of itens) {
        await client.query(
          `INSERT INTO itens_vendas (venda_id, produto_id, quantidade, preco_unitario)
           VALUES ($1,$2,$3,$4)`,
          [
            venda.rows[0].id,
            item.produto_id,
            item.quantidade,
            item.preco_unitario,
          ],
        );
      }

      await client.query('COMMIT');
      return venda.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
  async createDireta({ clienteNome, cliente_id, itens }) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const venda = await client.query(
        `INSERT INTO vendas (cliente_id, cliente_nome)
       VALUES ($1,$2)
       RETURNING *`,
        [cliente_id || null, clienteNome],
      );

      for (const item of itens) {
        await client.query(
          `INSERT INTO itens_vendas (venda_id, produto_id, quantidade, preco_unitario)
         VALUES ($1,$2,$3,$4)`,
          [
            venda.rows[0].id,
            item.produto_id,
            item.quantidade,
            item.preco_unitario,
          ],
        );
      }

      await client.query('COMMIT');
      return venda.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async list() {
    const { rows } = await pool.query('SELECT * FROM vendas ORDER BY id DESC');
    return rows;
  },
  async listAbertasComItens() {
    const { rows } = await pool.query(`
    SELECT
      v.id,
      v.orcamento_id,
      v.cliente_nome,
      v.status,
      v.criado_em,

      COALESCE(
        SUM(iv.quantidade * iv.preco_unitario),
        0
      ) AS valor_total,

      COALESCE(
        SUM(iv.quantidade),
        0
      ) AS total_itens,

      COALESCE(
        json_agg(
          json_build_object(
            'id', iv.id,
            'produto_id', iv.produto_id,
            'quantidade', iv.quantidade,
            'preco_unitario', iv.preco_unitario,
            'produto_nome', p.nome,
            'tipo', p.tipo
          )
        ) FILTER (WHERE iv.id IS NOT NULL),
        '[]'
      ) AS itens

    FROM vendas v
    LEFT JOIN itens_vendas iv ON iv.venda_id = v.id
    LEFT JOIN produtos p ON p.id = iv.produto_id
    WHERE v.status IN ('aberto', 'parcial')
    GROUP BY v.id
    ORDER BY v.id DESC
  `);

    return rows;
  },
  async getReservadoPorVenda() {
    const { rows } = await pool.query(`
    SELECT
      venda_id,
      produto_id,
      COALESCE(SUM(quantidade), 0) AS quantidade_reservada
    FROM reservas_venda
    WHERE status = 'reservado'
    GROUP BY venda_id, produto_id
  `);

    return rows;
  },
};
