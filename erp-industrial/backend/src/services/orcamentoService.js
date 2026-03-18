import { orcamentoRepository } from '../repositories/orcamentoRepository.js';
import { httpError } from '../utils/httpError.js';

const templates = [
  {
    nome: 'Equipamento A',
    itens: [
      { produto_id: 1, nome: 'Produto 1', quantidade: 1 },
      { produto_id: 2, nome: 'Produto 2', quantidade: 2 },
      { produto_id: 3, nome: 'Produto 3', quantidade: 1 },
    ],
  },
  {
    nome: 'Linha Básica B',
    itens: [
      { produto_id: 4, nome: 'Insumo X', quantidade: 3 },
      { produto_id: 5, nome: 'Componente Y', quantidade: 1 },
    ],
  },
];

export const orcamentoService = {
  async create(payload) {
    if (
      !payload.clienteNome ||
      !Array.isArray(payload.itens) ||
      !payload.itens.length
    ) {
      throw httpError('clienteNome e itens são obrigatórios');
    }

    payload.itens.forEach((item) => {
      if (!item.produto_id || !item.quantidade) {
        throw httpError('Cada item precisa de produto_id e quantidade');
      }
      if (item.preco_customizado == null && item.preco_unitario == null) {
        throw httpError(
          'Cada item precisa de preco_customizado ou preco_unitario',
        );
      }
    });

    return orcamentoRepository.create(payload);
  },

  async aprovarOrcamento(id) {
    const orcamento = await orcamentoRepository.getById(id);

    if (!orcamento) throw new Error('Orçamento não encontrado');

    // 1. atualizar status
    await orcamentoRepository.updateStatus(id, 'aprovado');

    // 2. buscar itens do orçamento
    const itens = await orcamentoRepository.getItens(id);

    for (const item of itens) {
      // 3. criar ordem de produção
      const op = await ordemProducaoRepository.create({
        produtoId: item.produto_id,
        quantidade: item.quantidade,
      });

      // 4. gerar requisição automaticamente
      await requisicaoService.criarParaOrdem(op.id, item.quantidade);
    }

    return { message: 'Orçamento aprovado com sucesso' };
  },

  async list() {
    return orcamentoRepository.list();
  },

  async updateStatus(id, status) {
    return orcamentoRepository.updateStatus(id, status);
  },

  async templates() {
    return templates;
  },
};
