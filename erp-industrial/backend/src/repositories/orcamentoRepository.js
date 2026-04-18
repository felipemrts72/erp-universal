import { pool } from '../database/pool.js';
import { orcamentoMetaRepository } from './orcamentoMetaRepository.js';
import { pagamentoRepository } from './pagamentoRepository.js';

export const orcamentoRepository = {
  async create({
    clienteNome,
    cliente_id,
    desconto_geral = 0,
    observacoes = '',
    formas_pagamento = [],
    itens,
  }) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const orcamento = await client.query(
        `
        INSERT INTO orcamentos (cliente_nome, cliente_id, desconto_geral, observacoes)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        `,
        [
          clienteNome,
          cliente_id || null,
          desconto_geral || 0,
          observacoes || '',
        ],
      );

      const itensCriados = [];

      for (const item of itens) {
        const insert = await client.query(
          `INSERT INTO itens_orcamento
         (
           orcamento_id,
           produto_id,
           quantidade,
           preco_unitario,
           desconto_valor,
           desconto_percentual
         )
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING *`,
          [
            orcamento.rows[0].id,
            item.produto_id,
            item.quantidade,
            item.preco_unitario,
            item.desconto_valor || 0,
            item.desconto_percentual || 0,
          ],
        );

        itensCriados.push(insert.rows[0]);
      }
      await pagamentoRepository.substituirPagamentosOrcamento(
        orcamento.rows[0].id,
        formas_pagamento || [],
        client,
      );
      await client.query('COMMIT');

      return { ...orcamento.rows[0], itens: itensCriados };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
  async updateCompleto(
    id,
    {
      clienteNome,
      cliente_id,
      desconto_geral = 0,
      observacoes = '',
      formas_pagamento = [],
      itens,
    },
  ) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      await client.query(
        `
      UPDATE orcamentos
      SET cliente_nome = $1,
          cliente_id = $2,
          desconto_geral = $3,
          observacoes = $4
      WHERE id = $5
      `,
        [
          clienteNome,
          cliente_id || null,
          desconto_geral,
          observacoes || '',
          id,
        ],
      );

      await client.query(
        `DELETE FROM itens_orcamento WHERE orcamento_id = $1`,
        [id],
      );

      const itensCriados = [];

      for (const item of itens) {
        const insert = await client.query(
          `
        INSERT INTO itens_orcamento
        (
          orcamento_id,
          produto_id,
          quantidade,
          preco_unitario,
          desconto_valor,
          desconto_percentual
        )
        VALUES ($1,$2,$3,$4,$5,$6)
        RETURNING *
        `,
          [
            id,
            item.produto_id,
            item.quantidade,
            item.preco_unitario,
            item.desconto_valor || 0,
            item.desconto_percentual || 0,
          ],
        );

        itensCriados.push(insert.rows[0]);
      }
      await pagamentoRepository.substituirPagamentosOrcamento(
        id,
        formas_pagamento || [],
        client,
      );

      await client.query('COMMIT');

      return {
        id,
        cliente_nome: clienteNome,
        cliente_id,
        desconto_geral,
        observacoes,
        formas_pagamento,
        itens: itensCriados,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async list() {
    const { rows } = await pool.query(
      'SELECT * FROM orcamentos ORDER BY id DESC',
    );
    return rows;
  },

  async getWithItens(id) {
    const { rows } = await pool.query(
      `
    SELECT *
    FROM orcamentos
    WHERE id = $1
    `,
      [id],
    );

    if (!rows[0]) return null;

    const itensResult = await pool.query(
      `
    SELECT 
      io.*,
      p.nome AS produto_nome
    FROM itens_orcamento io
    INNER JOIN produtos p ON p.id = io.produto_id
    WHERE io.orcamento_id = $1
    ORDER BY io.id
    `,
      [id],
    );

    const nomesMap = await orcamentoMetaRepository.mapearNomes(
      itensResult.rows.map((i) => i.id),
    );
    const formasPagamento = await pagamentoRepository.listarPagamentosOrcamento(
      id,
      pool,
    );

    return {
      ...rows[0],
      formas_pagamento: formasPagamento,
      itens: itensResult.rows.map((item) => ({
        ...item,
        produto_nome: item.produto_nome,
        nome_customizado: nomesMap[item.id],
      })),
    };
  },

  async updateStatus(id, status) {
    const { rows } = await pool.query(
      'UPDATE orcamentos SET status=$1 WHERE id=$2 RETURNING *',
      [status, id],
    );
    return rows[0];
  },
};
