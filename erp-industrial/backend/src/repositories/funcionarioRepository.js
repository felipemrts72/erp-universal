import { pool } from '../database/pool.js';

export const funcionarioRepository = {
  async create(
    { nome, cpf, telefone, email, setor, foto_url, salario, insalubridade },
    client = pool,
  ) {
    const { rows } = await client.query(
      `INSERT INTO funcionarios
       (nome, cpf, telefone, email, setor, foto_url, salario, insalubridade)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        nome,
        cpf,
        telefone || null,
        email || null,
        setor || null,
        foto_url || null,
        salario || null,
        insalubridade || null,
      ],
    );

    return rows[0];
  },

  async list() {
    const { rows } = await pool.query(
      `SELECT * FROM funcionarios
       WHERE status = 'ativo'
       ORDER BY nome`,
    );
    return rows;
  },

  async update(id, payload) {
    const { rows } = await pool.query(
      `
      UPDATE funcionarios
      SET nome = COALESCE($1, nome),
          cpf = COALESCE($2, cpf),
          telefone = COALESCE($3, telefone),
          email = COALESCE($4, email),
          setor = COALESCE($5, setor),
          foto_url = COALESCE($6, foto_url),
          salario = COALESCE($7, salario),
          insalubridade = COALESCE($8, insalubridade)
      WHERE id = $9
      RETURNING *
      `,
      [
        payload.nome,
        payload.cpf,
        payload.telefone,
        payload.email,
        payload.setor,
        payload.foto_url,
        payload.salario,
        payload.insalubridade,
        id,
      ],
    );

    return rows[0] || null;
  },

  async delete(id) {
    const { rows } = await pool.query(
      `UPDATE funcionarios
       SET status = 'inativo'
       WHERE id = $1
       RETURNING *`,
      [id],
    );

    return rows[0] || null;
  },

  async buscar(q) {
    const { rows } = await pool.query(
      `
      SELECT *
      FROM funcionarios
      WHERE status = 'ativo'
        AND (
          nome ILIKE $1 OR
          cpf ILIKE $1 OR
          telefone ILIKE $1 OR
          email ILIKE $1 OR
          setor ILIKE $1
        )
      ORDER BY nome
      LIMIT 20
      `,
      [`%${q}%`],
    );

    return rows;
  },
  async getById(id) {
    const { rows } = await pool.query(
      `SELECT * FROM funcionarios WHERE id = $1`,
      [id],
    );

    return rows[0] || null;
  },
};
