import { pool } from '../database/pool.js';

export const transportadoraRepository = {
  async list() {
    const { rows } = await pool.query(
      `
      SELECT
        id,
        nome,
        telefone,
        email,
        observacoes,
        status,
        criado_em
      FROM transportadoras
      ORDER BY nome ASC
      `,
    );

    return rows;
  },

  async listAtivas() {
    const { rows } = await pool.query(
      `
      SELECT
        id,
        nome,
        telefone,
        email,
        observacoes,
        status,
        criado_em
      FROM transportadoras
      WHERE status = 'ativo'
      ORDER BY nome ASC
      `,
    );

    return rows;
  },

  async getById(id) {
    const { rows } = await pool.query(
      `
      SELECT
        id,
        nome,
        telefone,
        email,
        observacoes,
        status,
        criado_em
      FROM transportadoras
      WHERE id = $1
      LIMIT 1
      `,
      [id],
    );

    return rows[0] || null;
  },

  async create({ nome, telefone, email, observacoes, status = 'ativo' }) {
    const { rows } = await pool.query(
      `
      INSERT INTO transportadoras
      (nome, telefone, email, observacoes, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [nome, telefone || null, email || null, observacoes || null, status],
    );

    return rows[0];
  },

  async update(id, { nome, telefone, email, observacoes, status }) {
    const { rows } = await pool.query(
      `
      UPDATE transportadoras
      SET
        nome = $2,
        telefone = $3,
        email = $4,
        observacoes = $5,
        status = $6
      WHERE id = $1
      RETURNING *
      `,
      [id, nome, telefone || null, email || null, observacoes || null, status],
    );

    return rows[0] || null;
  },

  async delete(id) {
    const { rows } = await pool.query(
      `
      DELETE FROM transportadoras
      WHERE id = $1
      RETURNING *
      `,
      [id],
    );

    return rows[0] || null;
  },

  async buscar(q) {
    const { rows } = await pool.query(
      `
      SELECT
        id,
        nome,
        telefone,
        email,
        observacoes,
        status,
        criado_em
      FROM transportadoras
      WHERE nome ILIKE $1
      ORDER BY nome ASC
      LIMIT 20
      `,
      [`%${q}%`],
    );

    return rows;
  },
};
