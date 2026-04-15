import { pool } from '../database/pool.js';

export const vendaRepository = {
  async createFromOrcamento(orcamento, itens, entrega = {}) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const venda = await client.query(
        `INSERT INTO vendas (
        orcamento_id,
        cliente_id,
        cliente_nome,
        tipo_entrega,
        transportadora_id,
        transportadora_nome_manual,
        observacoes_entrega,
        prazo_entrega
      )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
        [
          orcamento.id,
          orcamento.cliente_id || null,
          orcamento.cliente_nome,
          entrega.tipo_entrega || 'retirada',
          entrega.transportadora_id || null,
          entrega.transportadora_nome_manual || null,
          entrega.observacoes_entrega || null,
          entrega.prazo_entrega || null,
        ],
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
  async createDireta({
    clienteNome,
    cliente_id,
    tipo_entrega,
    transportadora_id,
    transportadora_nome_manual,
    observacoes_entrega,
    prazo_entrega,
    itens,
  }) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const venda = await client.query(
        `INSERT INTO vendas (
        cliente_id,
        cliente_nome,
        tipo_entrega,
        transportadora_id,
        transportadora_nome_manual,
        observacoes_entrega,
        prazo_entrega
      )
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
        [
          cliente_id || null,
          clienteNome,
          tipo_entrega || 'retirada',
          transportadora_id || null,
          transportadora_nome_manual || null,
          observacoes_entrega || null,
          prazo_entrega || null,
        ],
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
      v.tipo_entrega,
      v.transportadora_id,
      v.transportadora_nome_manual,
      v.observacoes_entrega,
      v.prazo_entrega,
      t.nome AS transportadora_nome,

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
    LEFT JOIN transportadoras t ON t.id = v.transportadora_id
    WHERE v.status IN ('aberto', 'parcial')
    GROUP BY v.id, t.nome, v.prazo_entrega
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
  async getByOrcamentoId(orcamentoId) {
    const { rows } = await pool.query(
      `
    SELECT *
    FROM vendas
    WHERE orcamento_id = $1
    LIMIT 1
    `,
      [orcamentoId],
    );

    return rows[0] || null;
  },

  async updateStatus(id, status) {
    const { rows } = await pool.query(
      `
    UPDATE vendas
    SET status = $2
    WHERE id = $1
    RETURNING *
    `,
      [id, status],
    );

    return rows[0] || null;
  },
};
