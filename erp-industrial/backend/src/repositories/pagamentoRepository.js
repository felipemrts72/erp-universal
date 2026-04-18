import { pool } from '../database/pool.js';

function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  return Number(value) || 0;
}

function distribuirValorParcelas(valorTotal, quantidadeParcelas) {
  const total = Math.round(toNumber(valorTotal) * 100);
  const parcelas = Number(quantidadeParcelas || 1);

  if (parcelas <= 0) return [];

  const base = Math.floor(total / parcelas);
  const resto = total % parcelas;

  return Array.from({ length: parcelas }, (_, index) => {
    const valorCentavos = base + (index < resto ? 1 : 0);
    return valorCentavos / 100;
  });
}

async function salvarParcelas({
  client,
  tabelaParcelas,
  formaPagamentoId,
  forma,
  valor,
  parcelas,
  datas = [],
}) {
  const quantidadeParcelas = Number(parcelas || 1);

  if (forma === 'cheque' || forma === 'boleto') {
    const valoresParcelas = distribuirValorParcelas(valor, quantidadeParcelas);

    for (let i = 0; i < quantidadeParcelas; i += 1) {
      await client.query(
        `
        INSERT INTO ${tabelaParcelas}
          (forma_pagamento_id, numero_parcela, data_vencimento, valor)
        VALUES ($1, $2, $3, $4)
        `,
        [formaPagamentoId, i + 1, datas?.[i] || null, valoresParcelas[i] || 0],
      );
    }
  }
}

export const pagamentoRepository = {
  async substituirPagamentosOrcamento(
    orcamentoId,
    pagamentos = [],
    client = pool,
  ) {
    await client.query(
      `DELETE FROM orcamento_formas_pagamento WHERE orcamento_id = $1`,
      [orcamentoId],
    );

    for (let i = 0; i < pagamentos.length; i += 1) {
      const pagamento = pagamentos[i];

      const { rows } = await client.query(
        `
        INSERT INTO orcamento_formas_pagamento
          (orcamento_id, forma, valor, parcelas, ordem)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
        `,
        [
          orcamentoId,
          pagamento.forma,
          toNumber(pagamento.valor),
          Number(pagamento.parcelas || 1),
          i,
        ],
      );

      await salvarParcelas({
        client,
        tabelaParcelas: 'orcamento_pagamento_parcelas',
        formaPagamentoId: rows[0].id,
        forma: pagamento.forma,
        valor: pagamento.valor,
        parcelas: pagamento.parcelas,
        datas: pagamento.datas || [],
      });
    }
  },

  async substituirPagamentosVenda(vendaId, pagamentos = [], client = pool) {
    await client.query(
      `DELETE FROM venda_formas_pagamento WHERE venda_id = $1`,
      [vendaId],
    );

    for (let i = 0; i < pagamentos.length; i += 1) {
      const pagamento = pagamentos[i];

      const { rows } = await client.query(
        `
        INSERT INTO venda_formas_pagamento
          (venda_id, forma, valor, parcelas, ordem)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
        `,
        [
          vendaId,
          pagamento.forma,
          toNumber(pagamento.valor),
          Number(pagamento.parcelas || 1),
          i,
        ],
      );

      await salvarParcelas({
        client,
        tabelaParcelas: 'venda_pagamento_parcelas',
        formaPagamentoId: rows[0].id,
        forma: pagamento.forma,
        valor: pagamento.valor,
        parcelas: pagamento.parcelas,
        datas: pagamento.datas || [],
      });
    }
  },

  async listarPagamentosOrcamento(orcamentoId, client = pool) {
    const { rows } = await client.query(
      `
      SELECT *
      FROM orcamento_formas_pagamento
      WHERE orcamento_id = $1
      ORDER BY ordem, id
      `,
      [orcamentoId],
    );

    const pagamentos = [];

    for (const row of rows) {
      const parcelasResult = await client.query(
        `
        SELECT numero_parcela, data_vencimento, valor
        FROM orcamento_pagamento_parcelas
        WHERE forma_pagamento_id = $1
        ORDER BY numero_parcela
        `,
        [row.id],
      );

      pagamentos.push({
        id: row.id,
        forma: row.forma,
        valor: Number(row.valor),
        parcelas: row.parcelas,
        datas: parcelasResult.rows.map((p) => p.data_vencimento),
        parcelas_detalhes: parcelasResult.rows.map((p) => ({
          numero_parcela: p.numero_parcela,
          data_vencimento: p.data_vencimento,
          valor: Number(p.valor),
        })),
      });
    }

    return pagamentos;
  },

  async listarPagamentosVenda(vendaId, client = pool) {
    const { rows } = await client.query(
      `
      SELECT *
      FROM venda_formas_pagamento
      WHERE venda_id = $1
      ORDER BY ordem, id
      `,
      [vendaId],
    );

    const pagamentos = [];

    for (const row of rows) {
      const parcelasResult = await client.query(
        `
        SELECT numero_parcela, data_vencimento, valor
        FROM venda_pagamento_parcelas
        WHERE forma_pagamento_id = $1
        ORDER BY numero_parcela
        `,
        [row.id],
      );

      pagamentos.push({
        id: row.id,
        forma: row.forma,
        valor: Number(row.valor),
        parcelas: row.parcelas,
        datas: parcelasResult.rows.map((p) => p.data_vencimento),
        parcelas_detalhes: parcelasResult.rows.map((p) => ({
          numero_parcela: p.numero_parcela,
          data_vencimento: p.data_vencimento,
          valor: Number(p.valor),
        })),
      });
    }

    return pagamentos;
  },
};
