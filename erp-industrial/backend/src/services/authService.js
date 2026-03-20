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
    if (!user) throw new Error('Usuário não encontrado');

    const senhaValida = await bcrypt.compare(senha, user.senha);
    if (!senhaValida) throw new Error('Senha inválida');

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: '1d',
    });

    return { token };
  },

  async register(payload, user) {
    const { nome, email, senha, role } = payload;

    // 🔥 verifica se já existe algum usuário
    const { rows: users } = await pool.query('SELECT COUNT(*) FROM usuarios');
    const totalUsers = Number(users[0].count);

    // 🧠 REGRA 1: primeiro usuário pode ser criado sem login
    if (totalUsers === 0) {
      if (role !== 'admin') {
        throw httpError('Primeiro usuário deve ser admin');
      }
    } else {
      // 🧠 REGRA 2: só admin pode criar usuários
      if (!user || user.role !== 'admin') {
        throw httpError('Apenas admin pode criar usuários', 403);
      }
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
};
