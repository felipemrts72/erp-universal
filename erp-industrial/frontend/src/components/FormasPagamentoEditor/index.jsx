import {
  FORMAS_PAGAMENTO_OPTIONS,
  createPagamentoItem,
  formatMoney,
  toNumber,
  calcularTotalPagamentos,
} from '../../utils/pagamentos';
import './style.css';

export default function FormasPagamentoEditor({
  pagamentos = [],
  totalLiquido = 0,
  onChange,
  titulo = 'Formas de pagamento',
}) {
  const totalPago = calcularTotalPagamentos(pagamentos);
  const restante = totalLiquido - totalPago;

  const updateItem = (id, field, value) => {
    const next = pagamentos.map((item) => {
      if (item.id !== id) return item;

      if (field === 'forma') {
        if (value === 'cheque' || value === 'boleto') {
          return {
            ...item,
            forma: value,
            parcelas: item.parcelas || 1,
            datas: item.datas?.length ? item.datas : [''],
          };
        }

        if (value === 'cartao_credito') {
          return {
            ...item,
            forma: value,
            parcelas: item.parcelas || 1,
            datas: [],
          };
        }

        return {
          ...item,
          forma: value,
          parcelas: 1,
          datas: [],
        };
      }

      return {
        ...item,
        [field]: value,
      };
    });

    onChange(next);
  };

  const addPagamento = () => {
    onChange([...pagamentos, createPagamentoItem()]);
  };

  const removePagamento = (id) => {
    onChange(pagamentos.filter((item) => item.id !== id));
  };

  const updateDatasParceladas = (id, quantidadeParcelas) => {
    const parcelas = Number(quantidadeParcelas || 1);

    const next = pagamentos.map((item) => {
      if (item.id !== id) return item;

      const datasAtuais = Array.isArray(item.datas) ? item.datas : [];
      const novasDatas = Array.from({ length: parcelas }, (_, index) => {
        return datasAtuais[index] || '';
      });

      return {
        ...item,
        parcelas,
        datas: novasDatas,
      };
    });

    onChange(next);
  };

  const updateDataItem = (id, dataIndex, value) => {
    const next = pagamentos.map((item) => {
      if (item.id !== id) return item;

      const novasDatas = [...(item.datas || [])];
      novasDatas[dataIndex] = value;

      return {
        ...item,
        datas: novasDatas,
      };
    });

    onChange(next);
  };

  return (
    <div className='pagamentos-editor'>
      <div className='pagamentos-editor__header'>
        <h3 className='pagamentos-editor__title'>{titulo}</h3>
        <button
          type='button'
          className='btn btn--secondary'
          onClick={addPagamento}
        >
          Adicionar pagamento
        </button>
      </div>

      {pagamentos.length === 0 ? (
        <div className='pagamentos-editor__empty'>
          Nenhuma forma de pagamento adicionada.
        </div>
      ) : (
        pagamentos.map((item, index) => (
          <div key={item.id} className='pagamentos-editor__card'>
            <div className='pagamentos-editor__top'>
              <strong>Pagamento {index + 1}</strong>

              <button
                type='button'
                className='btn btn--secondary pagamentos-editor__remove'
                onClick={() => removePagamento(item.id)}
              >
                Remover
              </button>
            </div>

            <div className='pagamentos-editor__grid'>
              <label className='pagamentos-editor__field'>
                <span>Forma</span>
                <select
                  value={item.forma}
                  onChange={(e) => updateItem(item.id, 'forma', e.target.value)}
                >
                  {FORMAS_PAGAMENTO_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className='pagamentos-editor__field'>
                <span>Valor</span>
                <input
                  value={item.valor}
                  onChange={(e) => updateItem(item.id, 'valor', e.target.value)}
                  placeholder='0,00'
                />
              </label>

              {item.forma === 'cartao_credito' && (
                <label className='pagamentos-editor__field'>
                  <span>Parcelas</span>
                  <select
                    value={item.parcelas || 1}
                    onChange={(e) =>
                      updateItem(item.id, 'parcelas', Number(e.target.value))
                    }
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(
                      (numero) => (
                        <option key={numero} value={numero}>
                          {numero}x
                        </option>
                      ),
                    )}
                  </select>
                </label>
              )}

              {(item.forma === 'cheque' || item.forma === 'boleto') && (
                <label className='pagamentos-editor__field'>
                  <span>Quantidade</span>
                  <select
                    value={item.parcelas || 1}
                    onChange={(e) =>
                      updateDatasParceladas(item.id, e.target.value)
                    }
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(
                      (numero) => (
                        <option key={numero} value={numero}>
                          {numero}x
                        </option>
                      ),
                    )}
                  </select>
                </label>
              )}
            </div>

            {(item.forma === 'cheque' || item.forma === 'boleto') && (
              <div className='pagamentos-editor__dates'>
                {(item.datas || []).map((data, dataIndex) => (
                  <label
                    key={`${item.id}-${dataIndex}`}
                    className='pagamentos-editor__field'
                  >
                    <span>Data {dataIndex + 1}</span>
                    <input
                      type='date'
                      value={data}
                      onChange={(e) =>
                        updateDataItem(item.id, dataIndex, e.target.value)
                      }
                    />
                  </label>
                ))}
              </div>
            )}

            <div className='pagamentos-editor__hint'>
              Valor informado:{' '}
              <strong>{formatMoney(toNumber(item.valor))}</strong>
            </div>
          </div>
        ))
      )}

      <div className='pagamentos-editor__summary'>
        <div>
          Total lançado: <strong>{formatMoney(totalPago)}</strong>
        </div>
        <div>
          Restante: <strong>{formatMoney(restante)}</strong>
        </div>
      </div>
    </div>
  );
}
