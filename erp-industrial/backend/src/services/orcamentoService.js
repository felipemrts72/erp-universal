import { orcamentoRepository } from '../repositories/orcamentoRepository.js';
import { httpError } from '../utils/httpError.js';
import { vendaService } from './vendaService.js';
import { vendaRepository } from '../repositories/vendaRepository.js';

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

    return orcamentoRepository.create({
      clienteNome: payload.clienteNome,
      cliente_id: payload.cliente_id || null,
      desconto_geral: payload.desconto_geral || 0,
      itens: payload.itens,
    });
  },
  async criarVenda(payload) {
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

      if (item.preco_unitario == null) {
        throw httpError('Cada item precisa de preco_unitario');
      }
    });

    // 1. cria orçamento já aprovado
    const orcamento = await orcamentoRepository.create({
      clienteNome: payload.clienteNome,
      cliente_id: payload.cliente_id || null,
      desconto_geral: payload.desconto_geral || 0,
      itens: payload.itens,
    });

    await orcamentoRepository.updateStatus(orcamento.id, 'aprovado');

    // 2. cria venda a partir do orçamento aprovado
    const venda = await vendaService.createFromOrcamento(orcamento.id);

    return {
      message: 'Venda lançada com sucesso',
      orcamento_id: orcamento.id,
      venda_id: venda.id,
    };
  },
  async buscar(q) {
    if (!q) return [];
    return orcamentoRepository.buscar(q);
  },
  async update(id, payload) {
    const orcamento = await orcamentoRepository.getWithItens(id);

    if (!orcamento) throw httpError('Orçamento não encontrado', 404);

    if (!['rascunho', 'enviado'].includes(orcamento.status)) {
      throw httpError(
        'Somente orçamentos em rascunho ou enviado podem ser editados',
      );
    }

    if (
      !payload.clienteNome ||
      !Array.isArray(payload.itens) ||
      !payload.itens.length
    ) {
      throw httpError('clienteNome e itens são obrigatórios');
    }

    return orcamentoRepository.updateCompleto(id, payload);
  },
  async clonar(id) {
    const original = await orcamentoRepository.getWithItens(id);

    if (!original) throw httpError('Orçamento não encontrado', 404);

    return orcamentoRepository.create({
      clienteNome: original.cliente_nome,
      cliente_id: original.cliente_id || null,
      desconto_geral: original.desconto_geral || 0,
      itens: original.itens.map((item) => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        desconto_valor: item.desconto_valor || 0,
        desconto_percentual: item.desconto_percentual || 0,
        nome_customizado: item.nome_customizado || undefined,
      })),
    });
  },
  /* async aprovarOrcamento(id) {
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
  }, */

  async list() {
    return orcamentoRepository.list();
  },

  async updateStatus(id, status) {
    const orcamento = await orcamentoRepository.getWithItens(id);

    if (!orcamento) {
      throw httpError('Orçamento não encontrado', 404);
    }

    const atualizado = await orcamentoRepository.updateStatus(id, status);

    if (status === 'aprovado') {
      const vendaExistente = await vendaRepository.getByOrcamentoId(id);

      if (!vendaExistente) {
        await vendaService.createFromOrcamento(id);
      }
    }

    return atualizado;
  },

  async templates() {
    return templates;
  },
  async getById(id) {
    const orcamento = await orcamentoRepository.getWithItens(id);

    if (!orcamento) {
      throw httpError('Orçamento não encontrado', 404);
    }

    return orcamento;
  },
};
