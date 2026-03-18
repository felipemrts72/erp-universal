import { producaoRepository } from '../repositories/producaoRepository.js';
import { estoqueRepository } from '../repositories/estoqueRepository.js';
import { httpError } from '../utils/httpError.js';

export const producaoService = {
  async createOrdem(payload) {
    return producaoRepository.createOrdem(payload);
  },

  async list() {
    return producaoRepository.list();
  },

  async iniciar(ordemId) {
    const ordem = await producaoRepository.getById(ordemId);
    if (!ordem) throw httpError('Ordem não encontrada', 404);

    const retiradaOk = await producaoRepository.houveRetiradaInsumos(ordemId);
    if (!retiradaOk) {
      throw httpError('Não é possível iniciar: retirada de insumos ainda não registrada');
    }

    return producaoRepository.updateStatus(ordemId, 'em_producao');
  },

  async finalizar(ordemId) {
    const ordem = await producaoRepository.getById(ordemId);
    if (!ordem) throw httpError('Ordem não encontrada', 404);

    await estoqueRepository.criarMovimentoEstoque({
      produtoId: ordem.produto_id,
      quantidade: Number(ordem.quantidade),
      tipoMovimento: 'entrada',
      referenciaTipo: 'ordem_producao_finalizada',
      referenciaId: ordem.id
    });

    return producaoRepository.updateStatus(ordemId, 'finalizado');
  }
};
