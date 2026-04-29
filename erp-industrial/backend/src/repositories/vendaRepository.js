import { pool } from '../database/pool.js';
import { pagamentoRepository } from './pagamentoRepository.js';

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
        prazo_entrega,
        observacoes,
        desconto_geral
      )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
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
          entrega.observacoes || orcamento.observacoes || null,
          entrega.desconto_geral ?? orcamento.desconto_geral ?? 0,
        ],
      );

      for (const item of itens) {
        await client.query(
          `INSERT INTO itens_vendas (
            venda_id,
            produto_id,
            quantidade,
            preco_unitario,
            desconto_valor,
            desconto_percentual
          )
         VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            venda.rows[0].id,
            item.produto_id,
            item.quantidade,
            item.preco_unitario,
            item.desconto_valor || 0,
            item.desconto_percentual || 0,
          ],
        );
      }

      await pagamentoRepository.substituirPagamentosVenda(
        venda.rows[0].id,
        entrega.formas_pagamento || orcamento.formas_pagamento || [],
        client,
      );

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
    observacoes,
    desconto_geral = 0,
    formas_pagamento = [],
    itens,
  }) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const venda = await client.query(
        `
        INSERT INTO vendas (
        cliente_id,
        cliente_nome,
        tipo_entrega,
        transportadora_id,
        transportadora_nome_manual,
        observacoes_entrega,
        prazo_entrega,
        observacoes,
        desconto_geral
      )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *
       `,
        [
          cliente_id || null,
          clienteNome,
          tipo_entrega || 'retirada',
          transportadora_id || null,
          transportadora_nome_manual || null,
          observacoes_entrega || null,
          prazo_entrega || null,
          observacoes || null,
          desconto_geral || 0,
        ],
      );

      for (const item of itens) {
        await client.query(
          `INSERT INTO itens_vendas (
            venda_id,
            produto_id,
            quantidade,
            preco_unitario,
            desconto_valor,
            desconto_percentual
          )
         VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            venda.rows[0].id,
            item.produto_id,
            item.quantidade,
            item.preco_unitario,
            item.desconto_valor || 0,
            item.desconto_percentual || 0,
          ],
        );
      }

      await pagamentoRepository.substituirPagamentosVenda(
        venda.rows[0].id,
        formas_pagamento || [],
        client,
      );
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
      v.cliente_id,
      v.cliente_nome,
      v.status,
      v.criado_em,
      v.tipo_entrega,
      v.transportadora_id,
      v.transportadora_nome_manual,
      v.observacoes_entrega,
      v.prazo_entrega,
      v.observacoes,
      v.desconto_geral,
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
        SUM(
          (iv.quantidade * iv.preco_unitario)
          -
          CASE
            WHEN COALESCE(iv.desconto_valor, 0) > 0
              THEN COALESCE(iv.desconto_valor, 0) * iv.quantidade
            ELSE
              (iv.quantidade * iv.preco_unitario) * (COALESCE(iv.desconto_percentual, 0)::numeric / 100)
          END
        ),
        0
      ) - COALESCE(v.desconto_geral, 0) AS valor_liquido,
      COALESCE(
        json_agg(
          json_build_object(
            'id', iv.id,
            'produto_id', iv.produto_id,
            'quantidade', iv.quantidade,
            'preco_unitario', iv.preco_unitario,
            'desconto_valor', iv.desconto_valor,
            'desconto_percentual', iv.desconto_percentual,
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

    const vendasComPagamentos = [];

    for (const row of rows) {
      const formas_pagamento = await pagamentoRepository.listarPagamentosVenda(
        row.id,
        pool,
      );

      vendasComPagamentos.push({
        ...row,
        formas_pagamento,
      });
    }

    return vendasComPagamentos;
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
