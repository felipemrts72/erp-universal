import { orcamentoRepository } from '../repositories/orcamentoRepository.js';
import { httpError } from '../utils/httpError.js';
import { vendaService } from './vendaService.js';
import { vendaRepository } from '../repositories/vendaRepository.js';
import { clienteRepository } from '../repositories/clienteRepository.js';

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
    const venda = await vendaService.createFromOrcamento(orcamento.id, {
      cliente_id: payload.cliente_id || null,
      tipo_entrega: payload.tipo_entrega || 'retirada',
      transportadora_id: payload.transportadora_id || null,
      transportadora_nome_manual: payload.transportadora_nome_manual || '',
      observacoes_entrega: payload.observacoes_entrega || '',
      prazo_entrega: payload.prazo_entrega || null,
    });
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
  async aprovar(id, payload) {
    const orcamento = await orcamentoRepository.getWithItens(id);

    if (!orcamento) {
      throw httpError('Orçamento não encontrado', 404);
    }

    if (orcamento.status === 'aprovado') {
      throw httpError('Orçamento já está aprovado', 400);
    }

    const vendaExistente = await vendaRepository.getByOrcamentoId(id);
    if (vendaExistente) {
      throw httpError('Este orçamento já gerou uma venda', 400);
    }

    let clienteId = orcamento.cliente_id || null;
    let clienteNome = orcamento.cliente_nome || '';

    if (!clienteId) {
      if (!payload.telefone || !String(payload.telefone).trim()) {
        throw httpError(
          'Telefone é obrigatório para cliente não cadastrado',
          400,
        );
      }

      if (!payload.email || !String(payload.email).trim()) {
        throw httpError(
          'E-mail é obrigatório para cliente não cadastrado',
          400,
        );
      }

      if (!payload.cpf_cnpj || !String(payload.cpf_cnpj).trim()) {
        throw httpError(
          'CPF/CNPJ é obrigatório para cliente não cadastrado',
          400,
        );
      }

      if (!payload.endereco || !String(payload.endereco).trim()) {
        throw httpError(
          'Endereço é obrigatório para cliente não cadastrado',
          400,
        );
      }

      if (!payload.numero || !String(payload.numero).trim()) {
        throw httpError(
          'Número é obrigatório para cliente não cadastrado',
          400,
        );
      }

      if (!payload.bairro || !String(payload.bairro).trim()) {
        throw httpError(
          'Bairro é obrigatório para cliente não cadastrado',
          400,
        );
      }

      if (!payload.cidade || !String(payload.cidade).trim()) {
        throw httpError(
          'Cidade é obrigatória para cliente não cadastrado',
          400,
        );
      }

      if (!payload.cep || !String(payload.cep).trim()) {
        throw httpError('CEP é obrigatório para cliente não cadastrado', 400);
      }

      const clienteCriado = await clienteRepository.create({
        nome: payload.nome_completo,
        nome_fantasia: payload.clienteNome,
        telefone: payload.telefone,
        email: payload.email,
        cpf_cnpj: payload.cpf_cnpj,
        endereco: payload.endereco,
        numero: payload.numero,
        bairro: payload.bairro,
        cidade: payload.cidade,
        cep: payload.cep,
      });

      clienteId = clienteCriado.id;
    }

    if (!payload.tipo_entrega) {
      throw httpError('Tipo de entrega é obrigatório', 400);
    }

    if (
      payload.tipo_entrega === 'transportadora' &&
      !payload.transportadora_id &&
      !String(payload.transportadora_nome_manual || '').trim()
    ) {
      throw httpError(
        'Selecione uma transportadora ou informe uma manualmente',
        400,
      );
    }

    await orcamentoRepository.updateStatus(id, 'aprovado');

    const venda = await vendaService.createFromOrcamento(id, {
      cliente_id: clienteId,
      tipo_entrega: payload.tipo_entrega,
      transportadora_id: payload.transportadora_id || null,
      transportadora_nome_manual: payload.transportadora_nome_manual || '',
      observacoes_entrega: payload.observacoes_entrega || '',
      prazo_entrega: payload.prazo_entrega || null,
    });

    return {
      message: 'Orçamento aprovado e venda gerada com sucesso',
      venda_id: venda.id,
    };
  },
};
