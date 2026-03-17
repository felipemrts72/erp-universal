import { orcamentoRepository } from '../repositories/orcamentoRepository.js';

export const orcamentoService = {
  async create(payload) {
    return orcamentoRepository.create(payload);
  },

  async list() {
    return orcamentoRepository.list();
  },

  async updateStatus(id, status) {
    return orcamentoRepository.updateStatus(id, status);
  }
};
