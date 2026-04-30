import { pool } from '../database/pool.js';

export const consumivelRepository = {
  async buscarProdutoPorId(produtoId, client) {
    const { rows } = await client.query(
      `SELECT id, nome, tipo FROM produtos WHERE id = $1`,
      [produtoId],
    );
    return rows[0] || null;
  },

  async buscarFuncionarioPorId(funcionarioId, client) {
    const { rows } = await client.query(
      `SELECT id, nome, setor FROM funcionarios WHERE id = $1`,
      [funcionarioId],
    );
    return rows[0] || null;
  },

  async criarConsumo(data, client) {
    const {
      produto_id,
      funcionario_id,
      usuario_id,
      setor,
      quantidade,
      assinatura_url,
      foto_url,
    } = data;

    const { rows } = await client.query(
      `INSERT INTO consumos_consumiveis
        (produto_id, funcionario_id, usuario_id, setor, quantidade, assinatura_url, foto_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        produto_id,
        funcionario_id,
        usuario_id,
        setor,
        quantidade,
        assinatura_url,
        foto_url,
      ],
    );

    return rows[0];
  },

  async listar(filters = {}) {
    const { data_inicio, data_fim, funcionario_id, produto_id, limit } =
      filters;

    const conditions = [];
    const values = [];

    if (data_inicio) {
      values.push(data_inicio);
      conditions.push(`c.criado_em >= $${values.length}`);
    }

    if (data_fim) {
      values.push(`${data_fim} 23:59:59`);
      conditions.push(`c.criado_em <= $${values.length}`);
    }

    if (funcionario_id) {
      values.push(funcionario_id);
      conditions.push(`c.funcionario_id = $${values.length}`);
    }

    if (produto_id) {
      values.push(produto_id);
      conditions.push(`c.produto_id = $${values.length}`);
    }

    let query = `
    SELECT 
      c.*,
      p.nome AS produto_nome,
      f.nome AS funcionario_nome,
      f.setor,
      u.nome AS usuario_nome
    FROM consumos_consumiveis c
    JOIN produtos p ON p.id = c.produto_id
    JOIN funcionarios f ON f.id = c.funcionario_id
    JOIN usuarios u ON u.id = c.usuario_id
  `;

    if (conditions.length) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY c.criado_em DESC`;

    if (limit) {
      values.push(Number(limit));
      query += ` LIMIT $${values.length}`;
    }

    const { rows } = await pool.query(query, values);
    return rows;
  },

  async buscarAlertas() {
    const { pool } = await import('../database/pool.js');

    const { rows } = await pool.query(`
      WITH base AS (
        SELECT
          produto_id,
          funcionario_id,
          criado_em,
          EXTRACT(EPOCH FROM (
            criado_em - LAG(criado_em) OVER (
              PARTITION BY produto_id, funcionario_id
              ORDER BY criado_em
            )
          )) / 3600 AS intervalo_horas
        FROM consumos_consumiveis
      ),
      media AS (
        SELECT
          produto_id,
          funcionario_id,
          AVG(intervalo_horas) AS media_horas
        FROM base
        WHERE intervalo_horas IS NOT NULL
        GROUP BY produto_id, funcionario_id
      )
      SELECT 
        b.*,
        m.media_horas
      FROM base b
      JOIN media m
        ON b.produto_id = m.produto_id
       AND b.funcionario_id = m.funcionario_id
      WHERE b.intervalo_horas IS NOT NULL
        AND b.intervalo_horas < m.media_horas * 0.5
    `);

    return rows;
  },

  async buscarRelatorioMensal() {
    const { pool } = await import('../database/pool.js');

    const { rows } = await pool.query(`
      SELECT 
        c.funcionario_id,
        f.nome AS funcionario_nome,
        c.setor,
        c.produto_id,
        p.nome AS produto_nome,
        SUM(c.quantidade) AS total_consumido,
        COUNT(*) AS total_retiradas
      FROM consumos_consumiveis c
      JOIN funcionarios f ON f.id = c.funcionario_id
      JOIN produtos p ON p.id = c.produto_id
      WHERE c.criado_em >= date_trunc('month', CURRENT_DATE)
      GROUP BY c.funcionario_id, f.nome, c.setor, c.produto_id, p.nome
      ORDER BY total_consumido DESC;
    `);

    return rows;
  },

  async atualizarJustificativa(id, justificativa) {
    const { pool } = await import('../database/pool.js');

    const { rows } = await pool.query(
      `UPDATE consumos_consumiveis
       SET justificativa = $1
       WHERE id = $2
       RETURNING *`,
      [justificativa, id],
    );

    return rows[0] || null;
  },

  async indicadoresConsumiveis() {
    const result = await db.query(`
    SELECT 
      c.funcionario_id,
      f.nome AS funcionario_nome,
      c.setor,
      c.produto_id,
      p.nome AS produto_nome,
      SUM(c.quantidade) AS total_consumido,
      COUNT(*) AS total_retiradas
    FROM consumos_consumiveis c
    JOIN funcionarios f ON f.id = c.funcionario_id
    JOIN produtos p ON p.id = c.produto_id
    WHERE c.criado_em >= date_trunc('month', CURRENT_DATE)
    GROUP BY c.funcionario_id, f.nome, c.setor, c.produto_id, p.nome
    ORDER BY total_consumido DESC
  `);

    return result.rows;
  },

  async buscarDetalhePorId(id) {
    const { rows } = await pool.query(
      `
    SELECT 
      c.*,
      p.nome AS produto_nome,
      p.unidade_medida,
      f.nome AS funcionario_nome,
      f.setor AS funcionario_setor,
      u.nome AS usuario_nome
    FROM consumos_consumiveis c
    JOIN produtos p ON p.id = c.produto_id
    JOIN funcionarios f ON f.id = c.funcionario_id
    LEFT JOIN usuarios u ON u.id = c.usuario_id
    WHERE c.id = $1
    LIMIT 1
    `,
      [id],
    );

    return rows[0] || null;
  },
};
