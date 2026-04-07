import { orcamentoRepository } from '../repositories/orcamentoRepository.js';
import { vendaRepository } from '../repositories/vendaRepository.js';
import { produtoRepository } from '../repositories/produtoRepository.js';
import { estoqueRepository } from '../repositories/estoqueRepository.js';
import { producaoRepository } from '../repositories/producaoRepository.js';
import { reservaVendaRepository } from '../repositories/reservaVendaRepository.js';
import { httpError } from '../utils/httpError.js';

function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  return Number(value) || 0;
}

async function reservarDisponivelParaVenda(vendaId, item, produto) {
  const saldoFisico = await estoqueRepository.getEstoqueAtual(item.produto_id);
  const reservado = await reservaVendaRepository.getReservadoPorProduto(
    item.produto_id,
  );

  const disponivel = Math.max(Number(saldoFisico) - Number(reservado), 0);
  const quantidadeVendida = Number(item.quantidade);
  const quantidadeReservar = Math.min(disponivel, quantidadeVendida);
  const faltante = Math.max(quantidadeVendida - quantidadeReservar, 0);

  if (quantidadeReservar > 0) {
    await reservaVendaRepository.criar({
      venda_id: vendaId,
      produto_id: item.produto_id,
      quantidade: quantidadeReservar,
      origem_movimento_id: null,
      status: 'reservado',
    });
  }

  return {
    saldoFisico,
    reservado,
    disponivel,
    quantidadeReservar,
    faltante,
  };
}

export const vendaService = {
  async createFromOrcamento(orcamentoId) {
    const orcamento = await orcamentoRepository.getWithItens(orcamentoId);

    if (!orcamento) throw httpError('Orçamento não encontrado', 404);
    if (orcamento.status !== 'aprovado') {
      throw httpError('Somente orçamento aprovado gera venda');
    }

    const venda = await vendaRepository.createFromOrcamento(
      orcamento,
      orcamento.itens,
    );

    for (const item of orcamento.itens) {
      const produto = await produtoRepository.getById(item.produto_id);

      if (!produto) {
        throw httpError(`Produto ${item.produto_id} não encontrado`, 404);
      }

      if (!['revenda', 'fabricado'].includes(produto.tipo)) {
        continue;
      }

      if (produto.tipo === 'revenda') {
        await reservarDisponivelParaVenda(venda.id, item, produto);
      }

      if (produto.tipo === 'fabricado') {
        const { faltante } = await reservarDisponivelParaVenda(
          venda.id,
          item,
          produto,
        );

        if (faltante > 0) {
          await producaoRepository.createOrdem({
            produtoId: item.produto_id,
            vendaId: venda.id,
            quantidade: faltante,
            status: 'pendente',
          });
        }
      }
    }

    return venda;
  },

  async createDireta(payload) {
    if (
      !payload.clienteNome ||
      !Array.isArray(payload.itens) ||
      !payload.itens.length
    ) {
      throw httpError('clienteNome e itens são obrigatórios', 400);
    }

    payload.itens.forEach((item) => {
      if (!item.produto_id || !item.quantidade) {
        throw httpError('Cada item precisa de produto_id e quantidade', 400);
      }

      if (item.preco_unitario == null) {
        throw httpError('Cada item precisa de preco_unitario', 400);
      }
    });

    const venda = await vendaRepository.createDireta({
      clienteNome: payload.clienteNome,
      cliente_id: payload.cliente_id || null,
      itens: payload.itens,
    });

    for (const item of payload.itens) {
      const produto = await produtoRepository.getById(item.produto_id);

      if (!produto) {
        throw httpError(`Produto ${item.produto_id} não encontrado`, 404);
      }

      if (!['revenda', 'fabricado'].includes(produto.tipo)) {
        continue;
      }

      if (produto.tipo === 'revenda') {
        await reservarDisponivelParaVenda(venda.id, item, produto);
      }

      if (produto.tipo === 'fabricado') {
        const { faltante } = await reservarDisponivelParaVenda(
          venda.id,
          item,
          produto,
        );

        if (faltante > 0) {
          await producaoRepository.createOrdem({
            produtoId: item.produto_id,
            vendaId: venda.id,
            quantidade: faltante,
            status: 'pendente',
          });
        }
      }
    }

    return venda;
  },

  async listarAbertas() {
    const vendas = await vendaRepository.listAbertasComItens();
    const reservas = await vendaRepository.getReservadoPorVenda();

    return vendas.map((venda) => {
      const itens = (venda.itens || []).map((item) => {
        const reserva = reservas.find(
          (r) =>
            Number(r.venda_id) === Number(venda.id) &&
            Number(r.produto_id) === Number(item.produto_id),
        );

        const quantidadeReservada = toNumber(reserva?.quantidade_reservada);
        const quantidadeVendida = toNumber(item.quantidade);
        const faltante = Math.max(quantidadeVendida - quantidadeReservada, 0);

        const precisa_comprar = item.tipo === 'revenda' && faltante > 0;

        const precisa_fabricar = item.tipo === 'fabricado' && faltante > 0;

        return {
          ...item,
          quantidade_reservada: quantidadeReservada,
          faltante,
          precisa_comprar,
          precisa_fabricar,
        };
      });

      const temFabricacao = itens.some((item) => item.precisa_fabricar);
      const temCompra = itens.some((item) => item.precisa_comprar);

      let status_venda = 'aguardando_retirada';

      if (temFabricacao && temCompra) {
        status_venda = 'producao_e_compra';
      } else if (temFabricacao) {
        status_venda = 'em_fabricacao';
      } else if (temCompra) {
        status_venda = 'processo_de_compra';
      }

      return {
        ...venda,
        itens,
        status_venda,
      };
    });
  },

  async list() {
    return vendaRepository.list();
  },
};
