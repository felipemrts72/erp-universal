import { pool } from '../database/pool.js';
import { consumivelRepository } from '../repositories/consumivelRepository.js';
import { estoqueRepository } from '../repositories/estoqueRepository.js';
import { httpError } from '../utils/httpError.js';
import { salvarBase64 } from '../utils/fileUpload.js';

export const consumivelService = {
  async registrarSaida(payload) {
    const {
      produto_id,
      quantidade,
      funcionario_id,
      usuario_id,
      setor,
      assinatura,
      foto,
    } = payload;

    if (!produto_id || !quantidade || !funcionario_id || !usuario_id) {
      throw httpError('Campos obrigatórios faltando');
    }

    if (Number(quantidade) <= 0) {
      throw httpError('Quantidade deve ser maior que zero');
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const produto = await consumivelRepository.buscarProdutoPorId(
        produto_id,
        client,
      );

      if (!produto) {
        throw httpError('Produto não encontrado', 404);
      }

      if (produto.tipo !== 'consumivel') {
        throw httpError('Produto não é consumível');
      }

      const funcionario = await consumivelRepository.buscarFuncionarioPorId(
        funcionario_id,
        client,
      );

      if (!funcionario) {
        throw httpError('Funcionário não encontrado', 404);
      }

      const saldo = await estoqueRepository.getEstoqueAtual(produto_id, client);

      if (Number(saldo) < Number(quantidade)) {
        throw httpError('Estoque insuficiente');
      }

      const assinaturaUrl = assinatura
        ? salvarBase64(assinatura, 'signatures')
        : null;

      const fotoUrl = foto ? salvarBase64(foto, 'photos') : null;

      await estoqueRepository.criarMovimento(
        {
          produtoId: produto_id,
          quantidade: -Number(quantidade),
          tipoMovimento: 'saida',
          referenciaTipo: 'consumo_consumivel',
          referenciaId: null,
        },
        client,
      );

      const consumo = await consumivelRepository.criarConsumo(
        {
          produto_id,
          funcionario_id,
          usuario_id,
          setor: setor ? String(setor).trim() : funcionario.setor || null,
          quantidade: Number(quantidade),
          assinatura_url: assinaturaUrl,
          foto_url: fotoUrl,
        },
        client,
      );

      await client.query('COMMIT');
      return consumo;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async listar(filters) {
    return consumivelRepository.listar(filters);
  },

  async alertas() {
    return consumivelRepository.buscarAlertas();
  },

  async relatorioMensal() {
    return consumivelRepository.buscarRelatorioMensal();
  },

  async detalhe(id) {
    const detalhe = await consumivelRepository.buscarDetalhePorId(id);

    if (!detalhe) {
      throw httpError('Retirada de consumível não encontrada', 404);
    }

    return detalhe;
  },

  async justificar(id, justificativa) {
    if (!justificativa || justificativa.trim().length < 10) {
      throw httpError('Justificativa muito curta');
    }

    const atualizado = await consumivelRepository.atualizarJustificativa(
      id,
      justificativa.trim(),
    );

    if (!atualizado) {
      throw httpError('Registro não encontrado', 404);
    }

    return atualizado;
  },
  async indicadoresConsumiveis() {
    return consumivelRepository.indicadoresConsumiveis();
  },
};
