import { pool } from '../database/pool.js';

function buildSearchTerm(q) {
  return `%${String(q || '').trim()}%`;
}

export const clienteRepository = {
  async create(payload) {
    const {
      nome,
      nome_fantasia,
      cpf_cnpj,
      telefone,
      email,
      endereco,
      numero,
      bairro,
      cidade,
      cep,
      observacoes = null,
    } = payload;

    const { rows } = await pool.query(
      `INSERT INTO clientes
       (nome, nome_fantasia,cpf_cnpj, telefone, email, endereco, numero, bairro, cidade, cep, observacoes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        nome,
        nome_fantasia || null,
        cpf_cnpj || null,
        telefone || null,
        email || null,
        endereco || null,
        numero || null,
        bairro || null,
        cidade || null,
        cep || null,
        observacoes,
      ],
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
      nome_fantasia,
      cpf_cnpj,
      telefone,
      email,
      endereco,
      numero,
      bairro,
      cidade,
      cep,
      observacoes,
    } = payload;

    const { rows } = await pool.query(
      `UPDATE clientes
        SET nome = COALESCE($1, nome),
            nome_fantasia = COALESCE($2, nome_fantasia),
            cpf_cnpj = COALESCE($3, cpf_cnpj),
            telefone = COALESCE($4, telefone),
            email = COALESCE($5, email),
            endereco = COALESCE($6, endereco),
            numero = COALESCE($7, numero),
            bairro = COALESCE($8, bairro),
            cidade = COALESCE($9, cidade),
            cep = COALESCE($10, cep),
            observacoes = COALESCE($11, observacoes)
        WHERE id = $12
       RETURNING *`,
      [
        nome,
        nome_fantasia,
        cpf_cnpj,
        telefone,
        email,
        endereco,
        numero,
        bairro,
        cidade,
        cep,
        observacoes,
        id,
      ],
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
    const termo = buildSearchTerm(q);

    const { rows } = await pool.query(
      `
    SELECT id, nome, nome_fantasia, cpf_cnpj, telefone, email, cidade
    FROM clientes
    WHERE status = 'ativo'
      AND (
        unaccent(lower(nome)) LIKE unaccent(lower($1)) OR
        unaccent(lower(nome_fantasia)) LIKE unaccent(lower($1)) OR
        cpf_cnpj ILIKE $1 OR
        telefone ILIKE $1 OR
        unaccent(lower(cidade)) LIKE unaccent(lower($1))
      )
    ORDER BY nome
    LIMIT 20
    `,
      [termo],
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
