import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../database/pool.js';
import { httpError } from '../utils/httpError.js';
import { funcionarioRepository } from '../repositories/funcionarioRepository.js';

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
  async create({
    nome,
    cpf,
    telefone,
    email,
    setor,
    foto,
    salario,
    insalubridade,
  }) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      if (!nome) throw httpError('Nome obrigatório');

      cpf = limparCPF(cpf);
      if (!validarCPF(cpf)) {
        throw httpError('CPF inválido');
      }

      if (salario !== undefined && salario !== null && Number(salario) < 0) {
        throw httpError('Salário inválido');
      }

      if (
        insalubridade !== undefined &&
        insalubridade !== null &&
        Number(insalubridade) < 0
      ) {
        throw httpError('Insalubridade inválida');
      }

      // 🔥 salva foto
      const fotoUrl = foto ? salvarFoto(foto) : null;

      const funcionario = await funcionarioRepository.create(
        {
          nome,
          cpf,
          telefone,
          email,
          setor,
          foto_url: fotoUrl,
          salario,
          insalubridade,
        },
        client,
      );

      await client.query('COMMIT');

      return funcionario;
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
    return funcionarioRepository.list();
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
    if (
      payload.salario !== undefined &&
      payload.salario !== null &&
      Number(payload.salario) < 0
    ) {
      throw httpError('Salário inválido');
    }

    if (
      payload.insalubridade !== undefined &&
      payload.insalubridade !== null &&
      Number(payload.insalubridade) < 0
    ) {
      throw httpError('Insalubridade inválida');
    }

    const funcionario = await funcionarioRepository.update(id, {
      nome: payload.nome,
      cpf,
      telefone: payload.telefone,
      email: payload.email,
      setor: payload.setor,
      foto_url: fotoUrl,
      salario: payload.salario,
      insalubridade: payload.insalubridade,
    });

    if (!funcionario) throw httpError('Funcionário não encontrado');

    return funcionario;
  },

  async delete(id) {
    const funcionario = await funcionarioRepository.delete(id);

    if (!funcionario) {
      throw httpError('Funcionário não encontrado', 404);
    }

    return funcionario;
  },

  async buscar(q) {
    if (!q) return [];
    return funcionarioRepository.buscar(q);
  },
};
