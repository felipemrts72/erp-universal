import { pool } from '../database/pool.js';

export const reservaVendaRepository = {
  async criar(
    {
      venda_id,
      produto_id,
      quantidade,
      origem_movimento_id = null,
      status = 'reservado',
    },
    client = pool,
  ) {
    const { rows } = await client.query(
      `
      INSERT INTO reservas_venda
      (venda_id, produto_id, quantidade, origem_movimento_id, status)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *
      `,
      [venda_id, produto_id, quantidade, origem_movimento_id, status],
    );

    return rows[0];
  },

  async listarPendentesCompra() {
    const { rows } = await pool.query(`
      SELECT
        v.id AS venda_id,
        v.cliente_nome,
        iv.produto_id,
        p.nome AS produto_nome,
        p.tipo,
        iv.quantidade AS quantidade_vendida,
        COALESCE(rv.total_reservado, 0) AS quantidade_reservada,
        GREATEST(iv.quantidade - COALESCE(rv.total_reservado, 0), 0) AS faltante
      FROM vendas v
      JOIN itens_vendas iv ON iv.venda_id = v.id
      JOIN produtos p ON p.id = iv.produto_id
      LEFT JOIN (
        SELECT
          venda_id,
          produto_id,
          SUM(quantidade) AS total_reservado
        FROM reservas_venda
        WHERE status = 'reservado'
        GROUP BY venda_id, produto_id
      ) rv
        ON rv.venda_id = v.id
       AND rv.produto_id = iv.produto_id
      WHERE v.status IN ('aberto', 'parcial')
        AND p.tipo = 'revenda'
        AND GREATEST(iv.quantidade - COALESCE(rv.total_reservado, 0), 0) > 0
      ORDER BY v.id DESC, p.nome
    `);

    return rows;
  },
  async buscarPendencia(venda_id, produto_id) {
    const { rows } = await pool.query(
      `
    SELECT
      v.id AS venda_id,
      iv.produto_id,
      iv.quantidade AS quantidade_vendida,
      COALESCE(rv.total_reservado, 0) AS quantidade_reservada,
      GREATEST(iv.quantidade - COALESCE(rv.total_reservado, 0), 0) AS faltante
    FROM vendas v
    JOIN itens_vendas iv ON iv.venda_id = v.id
    LEFT JOIN (
      SELECT
        venda_id,
        produto_id,
        SUM(quantidade) AS total_reservado
      FROM reservas_venda
      WHERE status = 'reservado'
      GROUP BY venda_id, produto_id
    ) rv
      ON rv.venda_id = v.id
     AND rv.produto_id = iv.produto_id
    WHERE v.id = $1
      AND iv.produto_id = $2
    LIMIT 1
  `,
      [venda_id, produto_id],
    );

    return rows[0] || null;
  },
  async getReservadoPorProduto(produto_id, client = pool) {
    const { rows } = await client.query(
      `
    SELECT COALESCE(SUM(quantidade), 0) AS total_reservado
    FROM reservas_venda
    WHERE produto_id = $1
      AND status = 'reservado'
    `,
      [produto_id],
    );

    return Number(rows[0]?.total_reservado || 0);
  },
};
