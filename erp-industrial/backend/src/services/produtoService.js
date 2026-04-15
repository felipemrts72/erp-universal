import { produtoRepository } from '../repositories/produtoRepository.js';
import { httpError } from '../utils/httpError.js';
import { pool } from '../database/pool.js';

const tiposValidos = [
  'materia_prima',
  'revenda',
  'fabricado',
  'conjunto',
  'consumivel',
];

export const produtoService = {
  async create(payload, user) {
    if (!tiposValidos.includes(payload.tipo)) {
      throw httpError('Tipo de produto inválido');
    }

    const precisaPreco =
      payload.tipo === 'revenda' ||
      payload.tipo === 'fabricado' ||
      payload.tipo === 'conjunto';

    // 🔐 regra de permissão
    if (user.role === 'estoquista') {
      payload.precoVenda = null;
    } else {
      if (precisaPreco && payload.precoVenda == null) {
        throw httpError('Preço de venda é obrigatório');
      }
    }

    if (payload.precoVenda == null) {
      payload.precoVenda = 0;
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const produto = await produtoRepository.create(payload, client);

      if (
        (payload.tipo === 'fabricado' || payload.tipo === 'conjunto') &&
        payload.componentes?.length
      ) {
        for (const comp of payload.componentes) {
          await produtoRepository.addComponente(
            {
              produtoId: produto.id,
              componenteId: comp.componenteId,
              quantidade: comp.quantidade,
            },
            client,
          );
        }
      }

      await client.query('COMMIT');
      return produto;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async list() {
    return produtoRepository.list();
  },

  async addComponente(payload) {
    const produto = await produtoRepository.getById(payload.produtoId);
    if (!produto) throw httpError('Produto não encontrado', 404);

    if (produto.tipo !== 'fabricado' && produto.tipo !== 'conjunto') {
      throw httpError(
        'Apenas produtos fabricados ou conjunto aceitam componentes',
      );
    }

    return produtoRepository.addComponente(payload);
  },

  async buscar(q, tipos = []) {
    if (!q) return [];
    return produtoRepository.buscar(q, tipos);
  },
};
