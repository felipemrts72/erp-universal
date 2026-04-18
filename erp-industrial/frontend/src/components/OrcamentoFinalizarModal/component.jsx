import { useEffect, useMemo, useState } from 'react';
import FormasPagamentoEditor from '../FormasPagamentoEditor';
import { createPagamentoItem, validarPagamentos } from '../../utils/pagamentos';
import './style.css';

function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  return Number(String(value).replace(',', '.')) || 0;
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export default function OrcamentoFinalizarModal({
  open,
  onClose,
  onConfirm,
  itens = [],
  descontoGeralInicial = 0,
  observacoesInicial = '',
  pagamentosIniciais = [],
  modo = 'novo',
}) {
  const [descontoGeralInput, setDescontoGeralInput] = useState(
    String(descontoGeralInicial || 0),
  );
  const [descontoGeralAplicado, setDescontoGeralAplicado] = useState(
    toNumber(descontoGeralInicial),
  );
  const [observacoes, setObservacoes] = useState(observacoesInicial || '');
  const [pagamentos, setPagamentos] = useState(
    pagamentosIniciais.length ? pagamentosIniciais : [createPagamentoItem()],
  );

  useEffect(() => {
    if (open) {
      setDescontoGeralInput(String(descontoGeralInicial || 0));
      setDescontoGeralAplicado(toNumber(descontoGeralInicial));
      setObservacoes(observacoesInicial || '');
      setPagamentos(
        pagamentosIniciais.length
          ? pagamentosIniciais
          : [createPagamentoItem()],
      );
    }
  }, [open, descontoGeralInicial, observacoesInicial, pagamentosIniciais]);

  const totais = useMemo(() => {
    const listaItens = Array.isArray(itens) ? itens : [];

    const bruto = listaItens.reduce(
      (acc, item) =>
        acc + toNumber(item.quantidade) * toNumber(item.preco_unitario),
      0,
    );

    const descontoItens = listaItens.reduce((acc, item) => {
      const quantidade = toNumber(item.quantidade);
      const precoUnitario = toNumber(item.preco_unitario);
      const subtotal = quantidade * precoUnitario;

      const descontoValorUnitario = toNumber(item.desconto_valor);
      const descontoPercentual = toNumber(item.desconto_percentual);

      const descontoCalculado =
        descontoValorUnitario > 0
          ? descontoValorUnitario * quantidade
          : subtotal * (descontoPercentual / 100);

      return acc + descontoCalculado;
    }, 0);

    const liquido = Math.max(bruto - descontoItens - descontoGeralAplicado, 0);

    return {
      bruto,
      descontoItens,
      quantidadeItens: listaItens.length,
      descontoGeral: descontoGeralAplicado,
      liquido,
    };
  }, [itens, descontoGeralAplicado]);

  const aplicarDesconto = () => {
    const valor = toNumber(descontoGeralInput);
    setDescontoGeralAplicado(valor < 0 ? 0 : valor);
  };

  const handleConfirm = () => {
    const erroPagamentos = validarPagamentos(pagamentos, totais.liquido);

    if (erroPagamentos) {
      window.alert(erroPagamentos);
      return;
    }

    if (typeof onConfirm === 'function') {
      onConfirm({
        descontoGeral: descontoGeralAplicado,
        observacoes,
        pagamentos,
        totais,
      });
    }
  };

  if (!open) return null;

  return (
    <div className='orcamento-modal__overlay' onClick={onClose}>
      <div className='orcamento-modal' onClick={(e) => e.stopPropagation()}>
        <div className='orcamento-modal__header'>
          <h2>Deseja finalizar este orçamento?</h2>
        </div>

        <div className='orcamento-modal__body'>
          <div className='orcamento-modal__row'>
            <span>Itens</span>
            <strong>{totais.quantidadeItens}</strong>
          </div>

          <div className='orcamento-modal__row'>
            <span>Total bruto</span>
            <strong>{formatMoney(totais.bruto)}</strong>
          </div>

          <div className='orcamento-modal__row'>
            <span>Desconto dos itens</span>
            <strong>{formatMoney(totais.descontoItens)}</strong>
          </div>

          <div className='orcamento-modal__field'>
            <label className='orcamento-modal__label'>Desconto geral</label>

            <div className='orcamento-modal__discount'>
              <input
                className='orcamento-modal__input'
                value={descontoGeralInput}
                onChange={(e) => setDescontoGeralInput(e.target.value)}
                placeholder='0,00'
              />

              <button
                type='button'
                className='btn btn--secondary'
                onClick={aplicarDesconto}
              >
                Aplicar desconto
              </button>
            </div>
          </div>

          <div className='orcamento-modal__row orcamento-modal__row--total'>
            <span>Total líquido</span>
            <strong>{formatMoney(totais.liquido)}</strong>
          </div>
          <div className='orcamento-modal__field'>
            <label className='orcamento-modal__label'>Observações</label>
            <textarea
              className='orcamento-modal__textarea'
              rows={4}
              maxLength={200}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder='Digite observações do orçamento'
            />
            <small className='orcamento-modal__hint'>
              {observacoes.length}/200 caracteres
            </small>
          </div>

          <FormasPagamentoEditor
            pagamentos={pagamentos}
            totalLiquido={totais.liquido}
            onChange={setPagamentos}
            titulo='Formas de pagamento'
          />
        </div>

        <div className='orcamento-modal__footer'>
          <button
            type='button'
            className='btn btn--secondary'
            onClick={onClose}
          >
            Cancelar
          </button>

          <button
            type='button'
            className='btn btn--primary'
            onClick={handleConfirm}
          >
            {modo === 'edicao' ? 'Salvar alterações' : 'Salvar orçamento'}
          </button>
        </div>
      </div>
    </div>
  );
}
