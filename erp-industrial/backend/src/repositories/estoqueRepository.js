import { pool } from '../database/pool.js';
import { auditoriaRepository } from './auditoriaRepository.js';

export const estoqueRepository = {
  async getEstoqueAtual(produtoId, client = pool) {
    const { rows } = await client.query(
      `
      SELECT COALESCE(SUM(quantidade), 0) AS saldo
      FROM movimentos_estoque
      WHERE produto_id = $1
      `,
      [produtoId],
    );

    return Number(rows[0].saldo);
  },

  async listarResumoEstoque() {
    const { rows } = await pool.query(
      `
      SELECT 
        p.id AS produto_id,
        p.nome AS produto,
        p.estoque_minimo,
        COALESCE(SUM(m.quantidade), 0) AS quantidade_atual,
        CASE
          WHEN COALESCE(SUM(m.quantidade), 0) < p.estoque_minimo THEN 'baixo'
          ELSE 'ok'
        END AS status
      FROM produtos p
      LEFT JOIN movimentos_estoque m ON m.produto_id = p.id
      GROUP BY p.id
      ORDER BY p.nome
      `,
    );

    return rows;
  },

  async buscar(q) {
    const { rows } = await pool.query(
      `
      SELECT 
        p.id,
        p.nome,
        p.sku,
        COALESCE(SUM(m.quantidade), 0) AS saldo
      FROM produtos p
      LEFT JOIN movimentos_estoque m ON m.produto_id = p.id
      WHERE p.nome ILIKE $1 OR p.sku ILIKE $1
      GROUP BY p.id
      ORDER BY p.nome
      LIMIT 20
      `,
      [`%${q}%`],
    );

    return rows;
  },

  async buscarMovimentos(q) {
    const { rows } = await pool.query(
      `
    SELECT 
      m.id,
      p.nome AS produto,
      m.quantidade,
      m.tipo_movimento,
      m.referencia_tipo,
      m.criado_em
    FROM movimentos_estoque m
    JOIN produtos p ON p.id = m.produto_id
    WHERE p.nome ILIKE $1
    ORDER BY m.criado_em DESC
    LIMIT 50
    `,
      [`%${q}%`],
    );

    return rows;
  },
  async listarMovimentos() {
    const { rows } = await pool.query(
      `
    SELECT 
      m.id,
      p.nome AS produto,
      m.quantidade,
      m.tipo_movimento,
      m.referencia_tipo,
      m.criado_em
    FROM movimentos_estoque m
    JOIN produtos p ON p.id = m.produto_id
    ORDER BY m.criado_em DESC
    LIMIT 100
    `,
    );

    return rows;
  },
  async listarMovimentosFiltrados({ start, end, page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;

    const { rows: items } = await pool.query(
      `
    SELECT 
      m.id,
      p.nome AS produto,
      m.quantidade,
      m.tipo_movimento,
      m.referencia_tipo,
      m.criado_em
    FROM movimentos_estoque m
    JOIN produtos p ON p.id = m.produto_id
    WHERE m.criado_em BETWEEN $1 AND $2
    ORDER BY m.criado_em DESC
    LIMIT $3 OFFSET $4
    `,
      [start, end, limit, offset],
    );

    const { rows: totalRows } = await pool.query(
      `
    SELECT COUNT(*)::int AS total
    FROM movimentos_estoque m
    WHERE m.criado_em BETWEEN $1 AND $2
    `,
      [start, end],
    );

    const total = totalRows[0].total;

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async criarMovimento(data, client = pool) {
    const {
      produtoId,
      quantidade,
      tipoMovimento,
      referenciaTipo,
      referenciaId,
    } = data;

    const { rows } = await client.query(
      `INSERT INTO movimentos_estoque
     (produto_id, quantidade, tipo_movimento, referencia_tipo, referencia_id)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
      [produtoId, quantidade, tipoMovimento, referenciaTipo, referenciaId],
    );

    return rows[0];
  },

  async registrarAuditoria(payload) {
    return auditoriaRepository.registrarAuditoria(payload);
  },

  async ajuste({ produto_id, diferenca, motivo, usuario_id }) {
    const { rows } = await pool.query(
      `
      INSERT INTO movimentos_estoque
      (produto_id, quantidade, tipo_movimento, referencia_tipo, referencia_id)
      VALUES ($1,$2,'ajuste',$3,$4)
      RETURNING *
      `,
      [produto_id, diferenca, motivo, usuario_id],
    );

    return rows[0];
  },
};
