import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { pool } from '../database/pool.js';
import { httpError } from '../utils/httpError.js';

const JWT_SECRET = 'segredo_super_simples_por_enquanto';

export const authService = {
  async login(email, senha) {
    const { rows } = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1',
      [email],
    );

    const user = rows[0];
    if (!user) throw httpError('Usuário não encontrado', 404);

    const senhaValida = await bcrypt.compare(senha, user.senha);
    if (!senhaValida) throw httpError('Senha inválida', 401);

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: '1d',
    });

    return {
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
      },
    };
  },

  async register(payload, user) {
    const { nome, email, senha, role } = payload;

    const { rows: users } = await pool.query('SELECT COUNT(*) FROM usuarios');
    const totalUsers = Number(users[0].count);

    if (totalUsers === 0) {
      throw httpError(
        'Cadastro inicial por rota está bloqueado. Crie o primeiro admin manualmente.',
        403,
      );
    }

    if (!user || user.role !== 'admin') {
      throw httpError('Apenas admin pode criar usuários', 403);
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const { rows } = await pool.query(
      `INSERT INTO usuarios (nome, email, senha, role)
       VALUES ($1,$2,$3,$4)
       RETURNING id, nome, email, role`,
      [nome, email, senhaHash, role],
    );

    return rows[0];
  },

  async me(user) {
    if (!user?.id) {
      throw httpError('Usuário não autenticado', 401);
    }

    const { rows } = await pool.query(
      `
      SELECT id, nome, email, role
      FROM usuarios
      WHERE id = $1
      `,
      [user.id],
    );

    const usuario = rows[0];

    if (!usuario) {
      throw httpError('Usuário não encontrado', 404);
    }

    return usuario;
  },
  async listUsers() {
    const { rows } = await pool.query(`
      SELECT id, nome, email, role, criado_em
      FROM usuarios
      ORDER BY nome
    `);

    return rows;
  },

  async listRoles() {
    const { rows } = await pool.query(`
      SELECT id, nome
      FROM roles
      ORDER BY nome
    `);

    return rows;
  },

  async createRole(payload) {
    const nome = String(payload.nome || '')
      .trim()
      .toLowerCase();

    if (!nome) {
      throw httpError('Nome da função obrigatório');
    }

    const { rows } = await pool.query(
      `
      INSERT INTO roles (nome)
      VALUES ($1)
      RETURNING id, nome
      `,
      [nome],
    );

    return rows[0];
  },
};
