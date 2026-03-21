import { entregaRepository } from '../repositories/entregaRepository.js';

export const entregaService = {
  async listarPendentes() {
    return entregaRepository.listarPendentes();
  },

  async listarTodas() {
    return entregaRepository.listarTodas();
  },

  async entregar(id, usuario_id, tipo) {
    const entrega = await entregaRepository.entregar(id, usuario_id, tipo);

    if (!entrega) {
      throw httpError('Entrega não encontrada ou já entregue');
    }

    return entrega;
  },
};
