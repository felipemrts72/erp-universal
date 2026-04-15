import { clienteRepository } from '../repositories/clienteRepository.js';
import { httpError } from '../utils/httpError.js';

export const clienteService = {
  async create(payload) {
    if (!payload.nome || !String(payload.nome).trim()) {
      throw httpError('Nome oficial / razão social é obrigatório');
    }

    return clienteRepository.create(payload);
  },

  async list() {
    return clienteRepository.list();
  },

  async update(id, payload) {
    const cliente = await clienteRepository.update(id, payload);

    if (!cliente) {
      throw httpError('Cliente não encontrado', 404);
    }

    return cliente;
  },

  async delete(id) {
    const cliente = await clienteRepository.delete(id);

    if (!cliente) {
      throw httpError('Cliente não encontrado', 404);
    }

    return cliente;
  },

  async buscar(q) {
    if (!q || q.length < 2) return [];
    return clienteRepository.buscar(q);
  },
};
