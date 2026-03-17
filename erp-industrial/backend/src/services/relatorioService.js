import { relatorioRepository } from '../repositories/relatorioRepository.js';

export const relatorioService = {
  async create(payload) {
    return relatorioRepository.create(payload);
  },
  async list() {
    return relatorioRepository.list();
  }
};
