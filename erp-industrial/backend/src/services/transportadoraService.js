import { transportadoraRepository } from '../repositories/transportadoraRepository.js';
import { httpError } from '../utils/httpError.js';

export const transportadoraService = {
  async list({ somenteAtivas = false } = {}) {
    if (somenteAtivas) {
      return transportadoraRepository.listAtivas();
    }

    return transportadoraRepository.list();
  },

  async getById(id) {
    const transportadora = await transportadoraRepository.getById(id);

    if (!transportadora) {
      throw httpError('Transportadora não encontrada', 404);
    }

    return transportadora;
  },

  async create(payload) {
    if (!payload.nome || !payload.nome.trim()) {
      throw httpError('Nome da transportadora é obrigatório', 400);
    }

    return transportadoraRepository.create({
      nome: payload.nome.trim(),
      telefone: payload.telefone || null,
      email: payload.email || null,
      observacoes: payload.observacoes || null,
      status: payload.status || 'ativo',
    });
  },

  async update(id, payload) {
    const existente = await transportadoraRepository.getById(id);

    if (!existente) {
      throw httpError('Transportadora não encontrada', 404);
    }

    if (!payload.nome || !payload.nome.trim()) {
      throw httpError('Nome da transportadora é obrigatório', 400);
    }

    const atualizada = await transportadoraRepository.update(id, {
      nome: payload.nome.trim(),
      telefone: payload.telefone || null,
      email: payload.email || null,
      observacoes: payload.observacoes || null,
      status: payload.status || 'ativo',
    });

    return atualizada;
  },

  async delete(id) {
    const existente = await transportadoraRepository.getById(id);

    if (!existente) {
      throw httpError('Transportadora não encontrada', 404);
    }

    return transportadoraRepository.delete(id);
  },

  async buscar(q) {
    if (!q) return [];
    return transportadoraRepository.buscar(q);
  },
};
