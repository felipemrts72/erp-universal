import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../database/pool.js';
import { httpError } from '../utils/httpError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function salvarFoto(base64) {
  const match = base64.match(/^data:(.+);base64,(.+)$/);
  if (!match) throw httpError('Imagem inválida');

  const ext = match[1].includes('png') ? 'png' : 'jpg';
  const nome = `funcionario-${Date.now()}.${ext}`;
  const dir = path.join(__dirname, '../../uploads/funcionarios');

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const destino = path.join(dir, nome);

  fs.writeFileSync(destino, Buffer.from(match[2], 'base64'));

  return `/uploads/funcionarios/${nome}`;
}

// 🔥 limpa CPF (remove tudo que não é número)
function limparCPF(cpf) {
  return cpf?.replace(/\D/g, '');
}

// 🔥 valida CPF de verdade
function validarCPF(cpf) {
  cpf = limparCPF(cpf);

  if (!cpf || cpf.length !== 11) return false;

  // bloqueia repetidos (111111..., 000000...)
  if (/^(\d)\1+$/.test(cpf)) return false;

  let soma = 0;
  let resto;

  // 1º dígito
  for (let i = 1; i <= 9; i++) {
    soma += parseInt(cpf[i - 1]) * (11 - i);
  }

  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;

  if (resto !== parseInt(cpf[9])) return false;

  // 2º dígito
  soma = 0;
  for (let i = 1; i <= 10; i++) {
    soma += parseInt(cpf[i - 1]) * (12 - i);
  }

  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;

  if (resto !== parseInt(cpf[10])) return false;

  return true;
}

export const funcionarioService = {
  async create({ nome, cpf, telefone, email, setor, foto }) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 🔥 valida nome
      if (!nome) throw httpError('Nome obrigatório');

      // 🔥 valida CPF
      cpf = limparCPF(cpf);
      if (!validarCPF(cpf)) {
        throw httpError('CPF inválido');
      }

      // 🔥 salva foto
      const fotoUrl = foto ? salvarFoto(foto) : null;

      const { rows } = await client.query(
        `INSERT INTO funcionarios
         (nome, cpf, telefone, email, setor, foto_url)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING *`,
        [nome, cpf, telefone, email, setor, fotoUrl],
      );

      await client.query('COMMIT');

      return rows[0];
    } catch (err) {
      await client.query('ROLLBACK');

      if (err.code === '23505') {
        throw httpError('CPF já cadastrado');
      }

      throw err;
    } finally {
      client.release();
    }
  },

  async list() {
    const { rows } = await pool.query(
      `SELECT * FROM funcionarios WHERE status = 'ativo' ORDER BY nome`,
    );
    return rows;
  },

  async update(id, payload) {
    let fotoUrl = null;

    if (payload.foto) {
      fotoUrl = salvarFoto(payload.foto);
    }

    let cpf = payload.cpf;

    if (cpf) {
      cpf = limparCPF(cpf);

      if (!validarCPF(cpf)) {
        throw httpError('CPF inválido');
      }
    }

    const { rows } = await pool.query(
      `UPDATE funcionarios
       SET nome = COALESCE($1, nome),
           cpf = COALESCE($2, cpf),
           telefone = COALESCE($3, telefone),
           email = COALESCE($4, email),
           setor = COALESCE($5, setor),
           foto_url = COALESCE($6, foto_url)
       WHERE id = $7
       RETURNING *`,
      [
        payload.nome,
        cpf,
        payload.telefone,
        payload.email,
        payload.setor,
        fotoUrl,
        id,
      ],
    );

    if (!rows.length) throw httpError('Funcionário não encontrado');

    return rows[0];
  },

  async delete(id) {
    const { rows } = await pool.query(
      `UPDATE funcionarios
       SET status = 'inativo'
       WHERE id = $1
       RETURNING *`,
      [id],
    );

    return rows[0];
  },

  async buscar(q) {
    if (!q) return [];

    const { rows } = await pool.query(
      `
      SELECT *
      FROM funcionarios
      WHERE status = 'ativo'
      AND (
        nome ILIKE $1 OR
        cpf ILIKE $1 OR
        telefone ILIKE $1 OR
        email ILIKE $1
      )
      ORDER BY nome
      LIMIT 20
      `,
      [`%${q}%`],
    );

    return rows;
  },
};
