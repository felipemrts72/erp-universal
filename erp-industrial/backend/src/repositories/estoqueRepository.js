// repositories/estoqueRepository.js
import { pool } from '../database/pool.js';

export const estoqueRepository = {
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
        p.nome,
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

  async criarMovimento(data, client = pool) {
    const {
      produtoId,
      quantidade,
      tipoMovimento,
      referenciaTipo,
      referenciaId,
    } = data;

    await client.query(
      `INSERT INTO movimentos_estoque
       (produto_id, quantidade, tipo_movimento, referencia_tipo, referencia_id)
       VALUES ($1,$2,$3,$4,$5)`,
      [produtoId, quantidade, tipoMovimento, referenciaTipo, referenciaId],
    );
  },

  async ajuste({ produto_id, diferenca, motivo, usuario_id }) {
    const { rows } = await pool.query(
      `INSERT INTO movimentos_estoque
       (produto_id, quantidade, tipo_movimento, referencia_tipo, referencia_id)
       VALUES ($1,$2,'ajuste',$3,$4)
       RETURNING *`,
      [produto_id, diferenca, motivo, usuario_id],
    );

    return rows[0];
  },
};
