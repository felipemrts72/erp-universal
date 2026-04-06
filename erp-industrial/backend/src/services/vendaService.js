import { orcamentoRepository } from '../repositories/orcamentoRepository.js';
import { vendaRepository } from '../repositories/vendaRepository.js';
import { produtoRepository } from '../repositories/produtoRepository.js';
import { estoqueRepository } from '../repositories/estoqueRepository.js';
import { producaoRepository } from '../repositories/producaoRepository.js';
import { httpError } from '../utils/httpError.js';

function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  return Number(value) || 0;
}

function montarErroEstoqueInsuficiente(produto, saldo, quantidade) {
  const erro = httpError('Há itens sem estoque suficiente', 409);
  erro.code = 'ESTOQUE_INSUFICIENTE';
  erro.itens_sem_estoque = [
    {
      produto_id: produto.id,
      produto_nome: produto.nome,
      quantidade_solicitada: Number(quantidade),
      saldo_atual: Number(saldo),
      faltante: Number(quantidade) - Number(saldo),
    },
  ];
  return erro;
}

export const vendaService = {
  async createFromOrcamento(orcamentoId, options = {}) {
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
        const saldo = await estoqueRepository.getEstoqueAtual(item.produto_id);

        if (saldo < Number(item.quantidade)) {
          if (!options?.forcar_estoque_negativo) {
            throw montarErroEstoqueInsuficiente(
              produto,
              saldo,
              item.quantidade,
            );
          }
        }

        await estoqueRepository.criarMovimento({
          produtoId: item.produto_id,
          quantidade: -Number(item.quantidade),
          tipoMovimento: 'saida',
          referenciaTipo: 'venda',
          referenciaId: venda.id,
        });
      }

      if (produto.tipo === 'fabricado') {
        const saldo = await estoqueRepository.getEstoqueAtual(item.produto_id);

        if (saldo >= Number(item.quantidade)) {
          await estoqueRepository.criarMovimento({
            produtoId: item.produto_id,
            quantidade: -Number(item.quantidade),
            tipoMovimento: 'saida',
            referenciaTipo: 'venda',
            referenciaId: venda.id,
          });
        } else {
          const faltante = Number(item.quantidade) - saldo;

          if (saldo > 0) {
            await estoqueRepository.criarMovimento({
              produtoId: item.produto_id,
              quantidade: -saldo,
              tipoMovimento: 'saida',
              referenciaTipo: 'venda',
              referenciaId: venda.id,
            });
          }

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

  async createDireta(payload, options = {}) {
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
        const saldo = await estoqueRepository.getEstoqueAtual(item.produto_id);

        if (saldo < Number(item.quantidade)) {
          if (!options?.forcar_estoque_negativo) {
            throw montarErroEstoqueInsuficiente(
              produto,
              saldo,
              item.quantidade,
            );
          }
        }

        await estoqueRepository.criarMovimento({
          produtoId: item.produto_id,
          quantidade: -Number(item.quantidade),
          tipoMovimento: 'saida',
          referenciaTipo: 'venda',
          referenciaId: venda.id,
        });
      }

      if (produto.tipo === 'fabricado') {
        const saldo = await estoqueRepository.getEstoqueAtual(item.produto_id);

        if (saldo >= Number(item.quantidade)) {
          await estoqueRepository.criarMovimento({
            produtoId: item.produto_id,
            quantidade: -Number(item.quantidade),
            tipoMovimento: 'saida',
            referenciaTipo: 'venda',
            referenciaId: venda.id,
          });
        } else {
          const faltante = Number(item.quantidade) - saldo;

          if (saldo > 0) {
            await estoqueRepository.criarMovimento({
              produtoId: item.produto_id,
              quantidade: -saldo,
              tipoMovimento: 'saida',
              referenciaTipo: 'venda',
              referenciaId: venda.id,
            });
          }

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
