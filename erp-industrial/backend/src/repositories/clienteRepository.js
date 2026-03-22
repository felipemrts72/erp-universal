import { pool } from '../database/pool.js';

export const clienteRepository = {
  async create(payload) {
    const {
      nome,
      cpf_cnpj,
      telefone,
      email,
      rua,
      numero,
      bairro,
      cidade,
      cep,
    } = payload;

    const { rows } = await pool.query(
      `INSERT INTO clientes
       (nome, cpf_cnpj, telefone, email, rua, numero, bairro, cidade, cep)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [nome, cpf_cnpj, telefone, email, rua, numero, bairro, cidade, cep],
    );

    return rows[0];
  },

  async list() {
    const { rows } = await pool.query(
      `SELECT * FROM clientes
       WHERE status = 'ativo'
       ORDER BY nome`,
    );
    return rows;
  },

  async update(id, payload) {
    const {
      nome,
      cpf_cnpj,
      telefone,
      email,
      rua,
      numero,
      bairro,
      cidade,
      cep,
    } = payload;

    const { rows } = await pool.query(
      `UPDATE clientes
       SET nome = COALESCE($1, nome),
           cpf_cnpj = COALESCE($2, cpf_cnpj),
           telefone = COALESCE($3, telefone),
           email = COALESCE($4, email),
           rua = COALESCE($5, rua),
           numero = COALESCE($6, numero),
           bairro = COALESCE($7, bairro),
           cidade = COALESCE($8, cidade),
           cep = COALESCE($9, cep)
       WHERE id = $10
       RETURNING *`,
      [nome, cpf_cnpj, telefone, email, rua, numero, bairro, cidade, cep, id],
    );

    return rows[0];
  },

  async delete(id) {
    const { rows } = await pool.query(
      `UPDATE clientes
       SET status = 'inativo'
       WHERE id = $1
       RETURNING *`,
      [id],
    );

    return rows[0];
  },

  async buscar(q) {
    const { rows } = await pool.query(
      `SELECT id, nome, cpf_cnpj, telefone, cidade
       FROM clientes
       WHERE status = 'ativo'
         AND (
           nome ILIKE $1 OR
           cpf_cnpj ILIKE $1 OR
           telefone ILIKE $1 OR
           cidade ILIKE $1
         )
       ORDER BY nome
       LIMIT 20`,
      [`%${q}%`],
    );

    return rows;
  },

  async getById(id) {
    const { rows } = await pool.query(`SELECT * FROM clientes WHERE id = $1`, [
      id,
    ]);
    return rows[0];
  },
};
