import { httpError } from './httpError.js';

function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  return Number(value) || 0;
}

export function validarPagamentos(formasPagamento = []) {
  if (!Array.isArray(formasPagamento)) {
    throw httpError('formas_pagamento inválido', 400);
  }

  for (const pagamento of formasPagamento) {
    if (!pagamento.forma || !String(pagamento.forma).trim()) {
      throw httpError('Toda forma de pagamento precisa de forma', 400);
    }

    if (toNumber(pagamento.valor) <= 0) {
      throw httpError(
        'Toda forma de pagamento precisa ter valor maior que zero',
        400,
      );
    }

    if (
      ['cheque', 'boleto'].includes(pagamento.forma) &&
      (!Array.isArray(pagamento.datas) ||
        !pagamento.datas.length ||
        pagamento.datas.some((data) => !data))
    ) {
      throw httpError(
        `Pagamentos em ${pagamento.forma} precisam de datas`,
        400,
      );
    }

    if (
      pagamento.forma === 'cartao_credito' &&
      (!pagamento.parcelas || Number(pagamento.parcelas) < 1)
    ) {
      throw httpError('Pagamento no crédito precisa de parcelas válidas', 400);
    }
  }
}
