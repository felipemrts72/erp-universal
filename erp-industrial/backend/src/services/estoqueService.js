import { estoqueRepository } from '../repositories/estoqueRepository.js';

export const estoqueService = {
  async registrarMovimento(payload) {
    return estoqueRepository.addMovimento(payload);
  },

  async listarMovimentos() {
    return estoqueRepository.listMovimentos();
  },

  async saldoPorProduto(produtoId) {
    return estoqueRepository.saldoPorProduto(produtoId);
  }
};
