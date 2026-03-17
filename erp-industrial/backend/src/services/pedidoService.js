import { orcamentoRepository } from '../repositories/orcamentoRepository.js';
import { pedidoRepository } from '../repositories/pedidoRepository.js';
import { produtoRepository } from '../repositories/produtoRepository.js';
import { estoqueRepository } from '../repositories/estoqueRepository.js';
import { producaoRepository } from '../repositories/producaoRepository.js';
import { httpError } from '../utils/httpError.js';

export const pedidoService = {
  async createFromOrcamento(orcamentoId) {
    const orcamento = await orcamentoRepository.getWithItens(orcamentoId);
    if (!orcamento) throw httpError('Orçamento não encontrado', 404);
    if (orcamento.status !== 'aprovado') throw httpError('Orçamento precisa estar aprovado');

    const pedido = await pedidoRepository.createFromOrcamento(orcamento, orcamento.itens);

    for (const item of orcamento.itens) {
      const produto = await produtoRepository.getById(item.produto_id);
      if (produto.tipo === 'revenda') {
        await estoqueRepository.addMovimento({
          produtoId: item.produto_id,
          quantidade: -Number(item.quantidade),
          tipoMovimento: 'saida',
          referenciaTipo: 'pedido',
          referenciaId: pedido.id
        });
      }
      if (produto.tipo === 'fabricado') {
        await producaoRepository.createOrdem({
          produtoId: item.produto_id,
          quantidade: item.quantidade,
          status: 'pendente'
        });
      }
    }

    return pedido;
  },

  async list() {
    return pedidoRepository.list();
  }
};
