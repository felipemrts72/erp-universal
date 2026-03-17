import { produtoRepository } from '../repositories/produtoRepository.js';
import { httpError } from '../utils/httpError.js';

const tiposValidos = ['materia_prima', 'revenda', 'fabricado', 'conjunto'];

export const produtoService = {
  async create(payload) {
    if (!tiposValidos.includes(payload.tipo)) {
      throw httpError('Tipo de produto inválido');
    }
    return produtoRepository.create(payload);
  },

  async list() {
    return produtoRepository.list();
  },

  async addComponente(payload) {
    const produto = await produtoRepository.getById(payload.produtoId);
    if (!produto) throw httpError('Produto não encontrado', 404);
    if (produto.tipo !== 'fabricado' && produto.tipo !== 'conjunto') {
      throw httpError('Apenas produtos fabricados ou conjunto aceitam componentes');
    }
    return produtoRepository.addComponente(payload);
  }
};
