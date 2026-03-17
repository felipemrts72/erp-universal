import { producaoRepository } from '../repositories/producaoRepository.js';
import { produtoRepository } from '../repositories/produtoRepository.js';
import { estoqueRepository } from '../repositories/estoqueRepository.js';
import { httpError } from '../utils/httpError.js';

export const producaoService = {
  async createOrdem(payload) {
    return producaoRepository.createOrdem(payload);
  },

  async list() {
    return producaoRepository.list();
  },

  async iniciar(id) {
    const ordem = await producaoRepository.getById(id);
    if (!ordem) throw httpError('Ordem não encontrada', 404);

    const componentes = await produtoRepository.getComponentes(ordem.produto_id);
    for (const comp of componentes) {
      const saldo = await estoqueRepository.saldoPorProduto(comp.componente_id);
      const necessario = Number(comp.quantidade) * Number(ordem.quantidade);
      if (saldo < necessario) {
        return producaoRepository.updateStatus(id, 'aguardando_pecas');
      }
    }

    for (const comp of componentes) {
      const necessario = Number(comp.quantidade) * Number(ordem.quantidade);
      await estoqueRepository.addMovimento({
        produtoId: comp.componente_id,
        quantidade: -necessario,
        tipoMovimento: 'producao',
        referenciaTipo: 'ordem_producao',
        referenciaId: ordem.id
      });
    }

    return producaoRepository.updateStatus(id, 'em_producao');
  },

  async finalizar(id) {
    const ordem = await producaoRepository.getById(id);
    if (!ordem) throw httpError('Ordem não encontrada', 404);
    await estoqueRepository.addMovimento({
      produtoId: ordem.produto_id,
      quantidade: Number(ordem.quantidade),
      tipoMovimento: 'producao',
      referenciaTipo: 'ordem_producao',
      referenciaId: ordem.id
    });
    return producaoRepository.updateStatus(id, 'finalizado');
  }
};
