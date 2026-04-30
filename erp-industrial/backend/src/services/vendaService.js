import { clienteRepository } from '../repositories/clienteRepository.js';
import { orcamentoRepository } from '../repositories/orcamentoRepository.js';
import { vendaRepository } from '../repositories/vendaRepository.js';
import { produtoRepository } from '../repositories/produtoRepository.js';
import { estoqueRepository } from '../repositories/estoqueRepository.js';
import { producaoRepository } from '../repositories/producaoRepository.js';
import { reservaVendaRepository } from '../repositories/reservaVendaRepository.js';
import { entregaRepository } from '../repositories/entregaRepository.js';
import { httpError } from '../utils/httpError.js';
import { validarPagamentos } from '../utils/validarPagamentos.js';

function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  return Number(value) || 0;
}

async function reservarDisponivelParaVenda(vendaId, item, produto) {
  const saldoFisico = await estoqueRepository.getEstoqueAtual(item.produto_id);
  const reservado = await reservaVendaRepository.getReservadoAtivoPorProduto(
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

function calcularStatusVendaPorItens(itens) {
  const temFabricacao = itens.some((item) => item.precisa_fabricar);
  const temCompra = itens.some((item) => item.precisa_comprar);

  if (temFabricacao && temCompra) return 'producao_e_compra';
  if (temFabricacao) return 'em_fabricacao';
  if (temCompra) return 'processo_de_compra';
  return 'aguardando_retirada';
}

async function analisarNecessidadeFabricacao(produtoId, quantidadeFabricar) {
  const componentes = await produtoRepository.buscarComponentes(produtoId);
  const necessidadesCompra = [];
  const necessidadesProducao = [];

  for (const componente of componentes) {
    const necessario =
      toNumber(componente.quantidade) * toNumber(quantidadeFabricar);

    const saldoFisico = await estoqueRepository.getEstoqueAtual(
      componente.componente_id,
    );

    const reservado = await reservaVendaRepository.getReservadoAtivoPorProduto(
      componente.componente_id,
    );

    const disponivel = Math.max(toNumber(saldoFisico) - toNumber(reservado), 0);
    const faltante = Math.max(necessario - disponivel, 0);

    if (faltante <= 0) continue;

    if (componente.componente_tipo === 'materia_prima') {
      necessidadesCompra.push({
        produto_id: componente.componente_id,
        produto_nome: componente.componente_nome,
        quantidade: faltante,
        unidade_medida: componente.unidade_medida || 'UN',
        motivo: 'Componente necessário para produção',
      });
    }

    if (componente.componente_tipo === 'revenda') {
      necessidadesCompra.push({
        produto_id: componente.componente_id,
        produto_nome: componente.componente_nome,
        quantidade: faltante,
        unidade_medida: componente.unidade_medida || 'UN',
        motivo: 'Item de revenda necessário para produção',
      });
    }

    if (componente.componente_tipo === 'fabricado') {
      necessidadesProducao.push({
        produto_id: componente.componente_id,
        produto_nome: componente.componente_nome,
        quantidade: faltante,
        unidade_medida: componente.unidade_medida || 'UN',
        motivo: 'Subproduto fabricado necessário para produção',
      });

      const necessidadesFilhas = await analisarNecessidadeFabricacao(
        componente.componente_id,
        faltante,
      );

      necessidadesCompra.push(...necessidadesFilhas.necessidadesCompra);
      necessidadesProducao.push(...necessidadesFilhas.necessidadesProducao);
    }
  }

  return {
    necessidadesCompra,
    necessidadesProducao,
  };
}

export const vendaService = {
  async createFromOrcamento(orcamentoId, payload = {}) {
    const orcamento = await orcamentoRepository.getWithItens(orcamentoId);

    if (!orcamento) throw httpError('Orçamento não encontrado', 404);
    if (orcamento.status !== 'aprovado') {
      throw httpError('Somente orçamento aprovado gera venda');
    }

    const venda = await vendaRepository.createFromOrcamento(
      {
        ...orcamento,
        cliente_id: payload.cliente_id || orcamento.cliente_id || null,
      },
      orcamento.itens,
      {
        tipo_entrega: payload.tipo_entrega || 'retirada',
        transportadora_id: payload.transportadora_id || null,
        transportadora_nome_manual: payload.transportadora_nome_manual || null,
        observacoes_entrega: payload.observacoes_entrega || null,
        prazo_entrega: payload.prazo_entrega || null,
        observacoes: payload.observacoes || orcamento.observacoes || '',
        desconto_geral: payload.desconto_geral ?? orcamento.desconto_geral ?? 0,
        formas_pagamento:
          payload.formas_pagamento || orcamento.formas_pagamento || [],
      },
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

          const analise = await analisarNecessidadeFabricacao(
            item.produto_id,
            faltante,
          );

          console.log('Necessidades de compra:', analise.necessidadesCompra);
          console.log(
            'Necessidades de produção:',
            analise.necessidadesProducao,
          );
        }
      }

      await entregaRepository.criar({
        ordem_producao_id: null,
        venda_id: venda.id,
        produto_id: item.produto_id,
        quantidade: Number(item.quantidade),
        criado_por: null,
        tipo: venda.tipo_entrega || 'retirada',
        transportadora_id: venda.transportadora_id || null,
        transportadora_nome_manual: venda.transportadora_nome_manual || null,
      });
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

    validarPagamentos(payload.formas_pagamento || []);

    let clienteId = payload.cliente_id || null;

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

    const venda = await vendaRepository.createDireta({
      clienteNome: payload.clienteNome,
      cliente_id: clienteId,
      tipo_entrega: payload.tipo_entrega || 'retirada',
      transportadora_id: payload.transportadora_id || null,
      transportadora_nome_manual: payload.transportadora_nome_manual || null,
      observacoes_entrega: payload.observacoes_entrega || null,
      prazo_entrega: payload.prazo_entrega || null,
      observacoes: payload.observacoes || '',
      desconto_geral: payload.desconto_geral || 0,
      formas_pagamento: payload.formas_pagamento || [],
      itens: payload.itens.map((item) => ({
        ...item,
        desconto_valor: item.desconto_valor || 0,
        desconto_percentual: item.desconto_percentual || 0,
      })),
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
      await entregaRepository.criar({
        ordem_producao_id: null,
        venda_id: venda.id,
        produto_id: item.produto_id,
        quantidade: Number(item.quantidade),
        criado_por: null,
        tipo: venda.tipo_entrega || 'retirada',
        transportadora_id: venda.transportadora_id || null,
        transportadora_nome_manual: venda.transportadora_nome_manual || null,
      });
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
