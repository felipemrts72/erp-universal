import { orcamentoRepository } from '../repositories/orcamentoRepository.js';
import { httpError } from '../utils/httpError.js';

const templates = [
  {
    nome: 'Equipamento A',
    itens: [
      { produto_id: 1, nome: 'Produto 1', quantidade: 1 },
      { produto_id: 2, nome: 'Produto 2', quantidade: 2 },
      { produto_id: 3, nome: 'Produto 3', quantidade: 1 }
    ]
  },
  {
    nome: 'Linha Básica B',
    itens: [
      { produto_id: 4, nome: 'Insumo X', quantidade: 3 },
      { produto_id: 5, nome: 'Componente Y', quantidade: 1 }
    ]
  }
];

export const orcamentoService = {
  async create(payload) {
    if (!payload.clienteNome || !Array.isArray(payload.itens) || !payload.itens.length) {
      throw httpError('clienteNome e itens são obrigatórios');
    }

    payload.itens.forEach((item) => {
      if (!item.produto_id || !item.quantidade) {
        throw httpError('Cada item precisa de produto_id e quantidade');
      }
      if (item.preco_customizado == null && item.preco_unitario == null) {
        throw httpError('Cada item precisa de preco_customizado ou preco_unitario');
      }
    });

    return orcamentoRepository.create(payload);
  },

  async list() {
    return orcamentoRepository.list();
  },

  async updateStatus(id, status) {
    return orcamentoRepository.updateStatus(id, status);
  },

  async templates() {
    return templates;
  }
};
