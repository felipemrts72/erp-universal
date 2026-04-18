export const FORMAS_PAGAMENTO_OPTIONS = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'cartao_debito', label: 'Cartão de débito' },
  { value: 'cartao_credito', label: 'Crédito' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'outro', label: 'Outro' },
];

export function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  return Number(String(value).replace(',', '.')) || 0;
}

export function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function createPagamentoItem() {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    forma: 'pix',
    valor: '',
    parcelas: 1,
    datas: [''],
  };
}

export function getFormaPagamentoLabel(value) {
  return (
    FORMAS_PAGAMENTO_OPTIONS.find((item) => item.value === value)?.label ||
    value ||
    '-'
  );
}

export function normalizePagamento(item) {
  const forma = item?.forma || 'pix';
  const valor = toNumber(item?.valor);

  if (forma === 'cartao_credito') {
    return {
      forma,
      valor,
      parcelas: Number(item?.parcelas || 1),
      datas: [],
    };
  }

  if (forma === 'cheque' || forma === 'boleto') {
    const datas = Array.isArray(item?.datas) ? item.datas.filter(Boolean) : [];
    return {
      forma,
      valor,
      parcelas: datas.length || Number(item?.parcelas || 1),
      datas,
    };
  }

  return {
    forma,
    valor,
    parcelas: 1,
    datas: [],
  };
}

export function calcularTotalPagamentos(pagamentos = []) {
  return pagamentos.reduce((acc, item) => acc + toNumber(item.valor), 0);
}

export function validarPagamentos(pagamentos = [], totalLiquido = 0) {
  if (!pagamentos.length) {
    return 'Adicione pelo menos uma forma de pagamento';
  }

  const totalPagamentos = calcularTotalPagamentos(pagamentos);

  if (Math.abs(totalPagamentos - totalLiquido) > 0.009) {
    return `O total das formas de pagamento precisa fechar em ${formatMoney(
      totalLiquido,
    )}`;
  }

  for (const pagamento of pagamentos) {
    if (!pagamento.forma) {
      return 'Informe a forma de pagamento';
    }

    if (toNumber(pagamento.valor) <= 0) {
      return 'Todos os pagamentos precisam ter valor maior que zero';
    }

    if (
      (pagamento.forma === 'cheque' || pagamento.forma === 'boleto') &&
      (!Array.isArray(pagamento.datas) ||
        !pagamento.datas.length ||
        pagamento.datas.some((data) => !data))
    ) {
      return `Preencha todas as datas de ${
        pagamento.forma === 'cheque' ? 'cheque' : 'boleto'
      }`;
    }
  }

  return null;
}
