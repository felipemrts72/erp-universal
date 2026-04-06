import { reservaVendaRepository } from '../repositories/reservaVendaRepository.js';
import { estoqueRepository } from '../repositories/estoqueRepository.js';
import { httpError } from '../utils/httpError.js';
import { pool } from '../database/pool.js';

export const reservaVendaService = {
  async vincularEntradaNaVenda({
    venda_id,
    produto_id,
    quantidade,
    custoUnitario,
    fornecedor,
    usuario_id,
  }) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      if (!venda_id) throw httpError('Venda obrigatória', 400);
      if (!produto_id) throw httpError('Produto obrigatório', 400);
      if (!quantidade || Number(quantidade) <= 0) {
        throw httpError('Quantidade inválida', 400);
      }

      const saldoAtual = await estoqueRepository.getEstoqueAtual(
        produto_id,
        client,
      );

      const { rows: produtoRows } = await client.query(
        'SELECT custo FROM produtos WHERE id = $1',
        [produto_id],
      );

      if (!produtoRows.length) {
        throw httpError('Produto não encontrado', 404);
      }

      const custoAtual = Number(produtoRows[0].custo || 0);
      const qtd = Number(quantidade);
      const custo = Number(custoUnitario || 0);

      const novoCusto =
        saldoAtual === 0
          ? custo
          : (custoAtual * saldoAtual + custo * qtd) / (saldoAtual + qtd);

      await client.query(
        `
        UPDATE produtos
        SET custo = $1,
            ultimo_preco_compra = $2
        WHERE id = $3
        `,
        [novoCusto, custo, produto_id],
      );

      const movimento = await estoqueRepository.criarMovimento(
        {
          produtoId: produto_id,
          quantidade: qtd,
          tipoMovimento: 'entrada',
          referenciaTipo: 'compra_vinculada',
          referenciaId: venda_id,
        },
        client,
      );

      await reservaVendaRepository.criar(
        {
          venda_id,
          produto_id,
          quantidade: qtd,
          origem_movimento_id: movimento?.id || null,
          status: 'reservado',
        },
        client,
      );

      await client.query('COMMIT');

      return { message: 'Entrada vinculada à venda com sucesso' };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async listarPendentesCompra() {
    return reservaVendaRepository.listarPendentesCompra();
  },
};
