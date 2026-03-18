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
    if (orcamento.status !== 'aprovado') throw httpError('Somente orçamento aprovado gera pedido');

    const pedido = await pedidoRepository.createFromOrcamento(orcamento, orcamento.itens);

    for (const item of orcamento.itens) {
      const produto = await produtoRepository.getById(item.produto_id);
      if (!produto) throw httpError(`Produto ${item.produto_id} não encontrado`, 404);

      if (produto.tipo === 'revenda') {
        const saldo = await estoqueRepository.getEstoqueAtual(item.produto_id);
        if (saldo < Number(item.quantidade)) {
          throw httpError(`Estoque insuficiente para revenda: ${produto.nome}`);
        }
        await estoqueRepository.criarMovimentoEstoque({
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
