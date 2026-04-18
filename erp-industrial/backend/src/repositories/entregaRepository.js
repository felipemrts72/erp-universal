import { pool } from '../database/pool.js';

export const entregaRepository = {
  async listarPendentes() {
    const { rows } = await pool.query(`
      SELECT
        MIN(e.id) AS id,
        e.venda_id,
        v.prazo_entrega,
        MIN(e.ordem_producao_id) AS ordem_producao_id,
        COUNT(*)::int AS total_itens_entrega,
        COALESCE(SUM(e.quantidade), 0) AS quantidade_total,
        'pendente' AS status,
        COALESCE(MAX(e.tipo), 'retirada') AS tipo,
        MAX(e.usuario_id) AS usuario_id,
        MIN(e.criado_em) AS criado_em,
        MAX(e.entregue_em) AS entregue_em,
        MAX(e.retirado_em) AS retirado_em,
        MAX(e.transportadora_id) AS transportadora_id,
        MAX(e.transportadora_nome_manual) AS transportadora_nome_manual,
        MAX(e.codigo_rastreio) AS codigo_rastreio,
        MAX(e.observacoes) AS observacoes,
        MAX(e.foto_saida_url) AS foto_saida_url,
        MAX(e.assinatura_saida_url) AS assinatura_saida_url,
        MAX(e.nome_recebedor) AS nome_recebedor,
        MAX(e.documento_recebedor) AS documento_recebedor,
        MAX(e.placa_veiculo) AS placa_veiculo,
        MAX(e.observacoes_saida) AS observacoes_saida,
        v.cliente_nome,
        t.nome AS transportadora_nome,
        STRING_AGG(
          DISTINCT (p.nome || ' (' || e.quantidade || ')'),
          ' | '
          ORDER BY (p.nome || ' (' || e.quantidade || ')')
        ) AS itens_resumo,
        COALESCE(
          JSON_AGG(
            DISTINCT JSONB_BUILD_OBJECT(
              'produto_nome', p.nome,
              'quantidade', e.quantidade
            )
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'
        ) AS itens
      FROM entregas e
      JOIN produtos p ON p.id = e.produto_id
      LEFT JOIN vendas v ON v.id = e.venda_id
      LEFT JOIN transportadoras t ON t.id = e.transportadora_id
      WHERE e.status = 'pendente'
        AND e.venda_id IS NOT NULL
      GROUP BY e.venda_id, v.cliente_nome, v.prazo_entrega, t.nome
      ORDER BY MIN(e.criado_em) ASC
    `);

    return rows;
  },

  async listarSaidasHoje() {
    const { rows } = await pool.query(`
      SELECT
        MIN(e.id) AS id,
        e.venda_id,
        v.prazo_entrega,
        MIN(e.ordem_producao_id) AS ordem_producao_id,
        COUNT(*)::int AS total_itens_entrega,
        COALESCE(SUM(e.quantidade), 0) AS quantidade_total,
        'entregue' AS status,
        COALESCE(MAX(e.tipo), 'retirada') AS tipo,
        MAX(e.usuario_id) AS usuario_id,
        MIN(e.criado_em) AS criado_em,
        MAX(e.entregue_em) AS entregue_em,
        MAX(e.retirado_em) AS retirado_em,
        MAX(e.transportadora_id) AS transportadora_id,
        MAX(e.transportadora_nome_manual) AS transportadora_nome_manual,
        MAX(e.codigo_rastreio) AS codigo_rastreio,
        MAX(e.observacoes) AS observacoes,
        MAX(e.foto_saida_url) AS foto_saida_url,
        MAX(e.assinatura_saida_url) AS assinatura_saida_url,
        MAX(e.nome_recebedor) AS nome_recebedor,
        MAX(e.documento_recebedor) AS documento_recebedor,
        MAX(e.placa_veiculo) AS placa_veiculo,
        MAX(e.observacoes_saida) AS observacoes_saida,
        v.cliente_nome,
        t.nome AS transportadora_nome,
        STRING_AGG(
          DISTINCT (p.nome || ' (' || e.quantidade || ')'),
          ' | '
          ORDER BY (p.nome || ' (' || e.quantidade || ')')
        ) AS itens_resumo,
        COALESCE(
          JSON_AGG(
            DISTINCT JSONB_BUILD_OBJECT(
              'produto_nome', p.nome,
              'quantidade', e.quantidade
            )
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'
        ) AS itens
      FROM entregas e
      JOIN produtos p ON p.id = e.produto_id
      LEFT JOIN vendas v ON v.id = e.venda_id
      LEFT JOIN transportadoras t ON t.id = e.transportadora_id
      WHERE e.status = 'entregue'
        AND e.venda_id IS NOT NULL
        AND DATE(COALESCE(e.retirado_em, e.entregue_em)) = CURRENT_DATE
      GROUP BY e.venda_id, v.cliente_nome, v.prazo_entrega, t.nome
      ORDER BY MAX(COALESCE(e.retirado_em, e.entregue_em)) DESC
    `);

    return rows;
  },

  async listarTodas() {
    const { rows } = await pool.query(`
      SELECT
        MIN(e.id) AS id,
        e.venda_id,
        v.prazo_entrega,
        MIN(e.ordem_producao_id) AS ordem_producao_id,
        COUNT(*)::int AS total_itens_entrega,
        COALESCE(SUM(e.quantidade), 0) AS quantidade_total,
        MAX(e.status) AS status,
        COALESCE(MAX(e.tipo), 'retirada') AS tipo,
        MAX(e.usuario_id) AS usuario_id,
        MIN(e.criado_em) AS criado_em,
        MAX(e.entregue_em) AS entregue_em,
        MAX(e.retirado_em) AS retirado_em,
        MAX(e.transportadora_id) AS transportadora_id,
        MAX(e.transportadora_nome_manual) AS transportadora_nome_manual,
        MAX(e.codigo_rastreio) AS codigo_rastreio,
        MAX(e.observacoes) AS observacoes,
        MAX(e.foto_saida_url) AS foto_saida_url,
        MAX(e.assinatura_saida_url) AS assinatura_saida_url,
        MAX(e.nome_recebedor) AS nome_recebedor,
        MAX(e.documento_recebedor) AS documento_recebedor,
        MAX(e.placa_veiculo) AS placa_veiculo,
        MAX(e.observacoes_saida) AS observacoes_saida,
        v.cliente_nome,
        t.nome AS transportadora_nome,
        STRING_AGG(
          DISTINCT (p.nome || ' (' || e.quantidade || ')'),
          ' | '
          ORDER BY (p.nome || ' (' || e.quantidade || ')')
        ) AS itens_resumo,
        COALESCE(
          JSON_AGG(
            DISTINCT JSONB_BUILD_OBJECT(
              'produto_nome', p.nome,
              'quantidade', e.quantidade
            )
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'
        ) AS itens
      FROM entregas e
      JOIN produtos p ON p.id = e.produto_id
      LEFT JOIN vendas v ON v.id = e.venda_id
      LEFT JOIN transportadoras t ON t.id = e.transportadora_id
      WHERE e.venda_id IS NOT NULL
      GROUP BY e.venda_id, v.cliente_nome, v.prazo_entrega, t.nome
      ORDER BY MIN(e.criado_em) DESC
    `);

    return rows;
  },

  async getResumoByVendaId(vendaId) {
    const { rows } = await pool.query(
      `
      SELECT
        MIN(e.id) AS id,
        e.venda_id,
        v.prazo_entrega,
        MIN(e.ordem_producao_id) AS ordem_producao_id,
        COUNT(*)::int AS total_itens_entrega,
        COALESCE(SUM(e.quantidade), 0) AS quantidade_total,
        MAX(e.status) AS status,
        COALESCE(MAX(e.tipo), 'retirada') AS tipo,
        MAX(e.usuario_id) AS usuario_id,
        MIN(e.criado_em) AS criado_em,
        MAX(e.entregue_em) AS entregue_em,
        MAX(e.retirado_em) AS retirado_em,
        MAX(e.transportadora_id) AS transportadora_id,
        MAX(e.transportadora_nome_manual) AS transportadora_nome_manual,
        MAX(e.codigo_rastreio) AS codigo_rastreio,
        MAX(e.observacoes) AS observacoes,
        MAX(e.foto_saida_url) AS foto_saida_url,
        MAX(e.assinatura_saida_url) AS assinatura_saida_url,
        MAX(e.nome_recebedor) AS nome_recebedor,
        MAX(e.documento_recebedor) AS documento_recebedor,
        MAX(e.placa_veiculo) AS placa_veiculo,
        MAX(e.observacoes_saida) AS observacoes_saida,
        v.cliente_nome,
        t.nome AS transportadora_nome,
        STRING_AGG(
          DISTINCT (p.nome || ' (' || e.quantidade || ')'),
          ' | '
          ORDER BY (p.nome || ' (' || e.quantidade || ')')
        ) AS itens_resumo,
        COALESCE(
          JSON_AGG(
            DISTINCT JSONB_BUILD_OBJECT(
              'produto_nome', p.nome,
              'quantidade', e.quantidade
            )
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'
        ) AS itens
      FROM entregas e
      JOIN produtos p ON p.id = e.produto_id
      LEFT JOIN vendas v ON v.id = e.venda_id
      LEFT JOIN transportadoras t ON t.id = e.transportadora_id
      WHERE e.venda_id = $1
      GROUP BY e.venda_id, v.cliente_nome, v.prazo_entrega, t.nome
      LIMIT 1
      `,
      [vendaId],
    );

    return rows[0] || null;
  },

  async countPendentesByVendaId(vendaId, client = pool) {
    const { rows } = await client.query(
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

  async entregarVenda(
    vendaId,
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
    client = pool,
  ) {
    const { rows } = await client.query(
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
       WHERE venda_id = $1
         AND status = 'pendente'
       RETURNING *`,
      [
        vendaId,
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

    return rows;
  },

  async listarPendentesRowsByVendaId(vendaId, client = pool) {
    const { rows } = await client.query(
      `
    SELECT *
    FROM entregas
    WHERE venda_id = $1
      AND status = 'pendente'
    ORDER BY id
    `,
      [vendaId],
    );

    return rows;
  },

  async auditoriaResumo() {
    const { rows } = await pool.query(`
      SELECT
        e.id,
        e.venda_id,
        e.ordem_producao_id,
        e.produto_id,
        e.quantidade,
        e.status,
        e.tipo,
        e.transportadora_id,
        e.transportadora_nome_manual,
        e.nome_recebedor,
        e.documento_recebedor,
        e.placa_veiculo,
        e.codigo_rastreio,
        e.observacoes_saida,
        e.foto_saida_url,
        e.assinatura_saida_url,
        e.criado_em,
        e.entregue_em,
        p.nome AS produto_nome,
        v.cliente_nome,
        v.prazo_entrega,
        t.nome AS transportadora_nome,
        u.nome AS usuario_nome
      FROM entregas e
      INNER JOIN produtos p ON p.id = e.produto_id
      LEFT JOIN vendas v ON v.id = e.venda_id
      LEFT JOIN transportadoras t ON t.id = e.transportadora_id
      LEFT JOIN usuarios u ON u.id = e.usuario_id
      ORDER BY e.id DESC
    `);

    return rows;
  },

  async auditoriaDetalhe(id) {
    const { rows } = await pool.query(
      `
      SELECT
        e.id,
        e.venda_id,
        e.ordem_producao_id,
        e.produto_id,
        e.quantidade,
        e.status,
        e.tipo,
        e.transportadora_id,
        e.transportadora_nome_manual,
        e.nome_recebedor,
        e.documento_recebedor,
        e.placa_veiculo,
        e.codigo_rastreio,
        e.observacoes_saida,
        e.foto_saida_url,
        e.assinatura_saida_url,
        e.criado_em,
        e.entregue_em,
        p.nome AS produto_nome,
        v.cliente_nome,
        v.prazo_entrega,
        t.nome AS transportadora_nome,
        u.nome AS usuario_nome
      FROM entregas e
      INNER JOIN produtos p ON p.id = e.produto_id
      LEFT JOIN vendas v ON v.id = e.venda_id
      LEFT JOIN transportadoras t ON t.id = e.transportadora_id
      LEFT JOIN usuarios u ON u.id = e.usuario_id
      WHERE e.id = $1
      `,
      [id],
    );

    return rows[0] || null;
  },

  async auditoriaIndicadores() {
    const { rows: statusEntrega } = await pool.query(`
      SELECT
        status,
        COUNT(*) AS total
      FROM entregas
      GROUP BY status
      ORDER BY total DESC
    `);

    const { rows: porTipo } = await pool.query(`
      SELECT
        tipo,
        COUNT(*) AS total
      FROM entregas
      GROUP BY tipo
      ORDER BY total DESC
    `);

    const { rows: transportadorasMaisUsadas } = await pool.query(`
      SELECT
        COALESCE(t.nome, e.transportadora_nome_manual, 'Sem transportadora') AS transportadora,
        COUNT(*) AS total
      FROM entregas e
      LEFT JOIN transportadoras t ON t.id = e.transportadora_id
      WHERE e.tipo = 'transportadora'
      GROUP BY COALESCE(t.nome, e.transportadora_nome_manual, 'Sem transportadora')
      ORDER BY total DESC
      LIMIT 10
    `);

    return {
      statusEntrega,
      porTipo,
      transportadorasMaisUsadas,
    };
  },
};
