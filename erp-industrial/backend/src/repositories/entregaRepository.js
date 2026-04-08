import { pool } from '../database/pool.js';

export const entregaRepository = {
  async listarPendentes() {
    const { rows } = await pool.query(`
      SELECT
        e.id,
        e.venda_id,
        e.ordem_producao_id,
        e.produto_id,
        e.quantidade,
        e.status,
        e.tipo,
        e.usuario_id,
        e.criado_em,
        e.entregue_em,
        e.retirado_em,
        e.transportadora_id,
        e.transportadora_nome_manual,
        e.codigo_rastreio,
        e.observacoes,
        e.foto_saida_url,
        e.assinatura_saida_url,
        e.nome_recebedor,
        e.documento_recebedor,
        e.placa_veiculo,
        e.observacoes_saida,
        p.nome AS produto_nome,
        v.cliente_nome,
        t.nome AS transportadora_nome
      FROM entregas e
      JOIN produtos p ON p.id = e.produto_id
      LEFT JOIN vendas v ON v.id = e.venda_id
      LEFT JOIN transportadoras t ON t.id = e.transportadora_id
      WHERE e.status = 'pendente'
      ORDER BY e.criado_em ASC
    `);

    return rows;
  },

  async listarSaidasHoje() {
    const { rows } = await pool.query(`
    SELECT
      e.id,
      e.venda_id,
      e.ordem_producao_id,
      e.produto_id,
      e.quantidade,
      e.status,
      e.tipo,
      e.usuario_id,
      e.criado_em,
      e.entregue_em,
      e.retirado_em,
      e.transportadora_id,
      e.transportadora_nome_manual,
      e.codigo_rastreio,
      e.observacoes,
      e.foto_saida_url,
      e.assinatura_saida_url,
      e.nome_recebedor,
      e.documento_recebedor,
      e.placa_veiculo,
      e.observacoes_saida,
      p.nome AS produto_nome,
      v.cliente_nome,
      t.nome AS transportadora_nome
    FROM entregas e
    JOIN produtos p ON p.id = e.produto_id
    LEFT JOIN vendas v ON v.id = e.venda_id
    LEFT JOIN transportadoras t ON t.id = e.transportadora_id
    WHERE e.status = 'entregue'
      AND DATE(COALESCE(e.retirado_em, e.entregue_em)) = CURRENT_DATE
    ORDER BY COALESCE(e.retirado_em, e.entregue_em) DESC
  `);

    return rows;
  },

  async listarTodas() {
    const { rows } = await pool.query(`
      SELECT
        e.id,
        e.venda_id,
        e.ordem_producao_id,
        e.produto_id,
        e.quantidade,
        e.status,
        e.tipo,
        e.usuario_id,
        e.criado_em,
        e.entregue_em,
        e.retirado_em,
        e.transportadora_id,
        e.transportadora_nome_manual,
        e.codigo_rastreio,
        e.observacoes,
        e.foto_saida_url,
        e.assinatura_saida_url,
        e.nome_recebedor,
        e.documento_recebedor,
        e.placa_veiculo,
        e.observacoes_saida,
        p.nome AS produto_nome,
        v.cliente_nome,
        t.nome AS transportadora_nome
      FROM entregas e
      JOIN produtos p ON p.id = e.produto_id
      LEFT JOIN vendas v ON v.id = e.venda_id
      LEFT JOIN transportadoras t ON t.id = e.transportadora_id
      ORDER BY e.criado_em DESC
    `);

    return rows;
  },

  async getById(id) {
    const { rows } = await pool.query(
      `
      SELECT *
      FROM entregas
      WHERE id = $1
      LIMIT 1
      `,
      [id],
    );

    return rows[0] || null;
  },

  async countPendentesByVendaId(vendaId) {
    const { rows } = await pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM entregas
      WHERE venda_id = $1
        AND status = 'pendente'
      `,
      [vendaId],
    );

    return rows[0]?.total || 0;
  },

  async criar(data, client = pool) {
    const {
      ordem_producao_id,
      venda_id,
      produto_id,
      quantidade,
      criado_por,
      tipo,
      transportadora_id,
      transportadora_nome_manual,
    } = data;

    const { rows } = await client.query(
      `INSERT INTO entregas
       (
         ordem_producao_id,
         venda_id,
         produto_id,
         quantidade,
         status,
         tipo,
         transportadora_id,
         transportadora_nome_manual,
         usuario_id
       )
       VALUES ($1,$2,$3,$4,'pendente',$5,$6,$7,$8)
       RETURNING *`,
      [
        ordem_producao_id || null,
        venda_id || null,
        produto_id,
        quantidade,
        tipo || 'retirada',
        transportadora_id || null,
        transportadora_nome_manual || null,
        criado_por || null,
      ],
    );

    return rows[0];
  },

  async entregar(
    id,
    {
      usuario_id,
      tipo,
      nome_recebedor,
      documento_recebedor,
      placa_veiculo,
      observacoes_saida,
      foto_saida_url,
      assinatura_saida_url,
      codigo_rastreio,
    },
  ) {
    const { rows } = await pool.query(
      `UPDATE entregas
       SET status = 'entregue',
           entregue_em = NOW(),
           retirado_em = NOW(),
           usuario_id = $2,
           tipo = $3,
           nome_recebedor = $4,
           documento_recebedor = $5,
           placa_veiculo = $6,
           observacoes_saida = $7,
           foto_saida_url = $8,
           assinatura_saida_url = $9,
           codigo_rastreio = $10
       WHERE id = $1
         AND status = 'pendente'
       RETURNING *`,
      [
        id,
        usuario_id || null,
        tipo || 'retirada',
        nome_recebedor || null,
        documento_recebedor || null,
        placa_veiculo || null,
        observacoes_saida || null,
        foto_saida_url || null,
        assinatura_saida_url || null,
        codigo_rastreio || null,
      ],
    );

    return rows[0] || null;
  },
};
