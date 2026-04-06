import { useEffect, useState } from 'react';
import './style.css';

function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  return Number(String(value).replace(',', '.')) || 0;
}

export default function OrcamentoItemEditarModal({
  open,
  item,
  onClose,
  onSave,
}) {
  const [form, setForm] = useState({
    quantidade: 1,
    preco_unitario: 0,
    desconto_valor: 0,
    desconto_percentual: 0,
    nome_customizado: '',
  });

  useEffect(() => {
    if (open && item) {
      setForm({
        quantidade: item.quantidade ?? 1,
        preco_unitario: item.preco_unitario ?? 0,
        desconto_valor: item.desconto_valor ?? 0,
        desconto_percentual: item.desconto_percentual ?? 0,
        nome_customizado: item.nome_customizado ?? '',
      });
    }
  }, [open, item]);

  if (!open || !item) return null;

  return (
    <div className="orcamento-item-editar-modal">
      <div
        className="orcamento-item-editar-modal__backdrop"
        onClick={onClose}
      />

      <div className="orcamento-item-editar-modal__card">
        <h2 className="orcamento-item-editar-modal__title">Editar item</h2>

        <div className="orcamento-item-editar-modal__subtitle">
          {item.produto_nome || item.descricao || 'Item'}
        </div>

        <div className="orcamento-item-editar-modal__grid">
          <label className="orcamento-item-editar-modal__field">
            <span>Quantidade</span>
            <input
              value={form.quantidade}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, quantidade: e.target.value }))
              }
            />
          </label>

          <label className="orcamento-item-editar-modal__field">
            <span>Preço unitário</span>
            <input
              value={form.preco_unitario}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, preco_unitario: e.target.value }))
              }
            />
          </label>

          <label className="orcamento-item-editar-modal__field">
            <span>Desconto valor</span>
            <input
              value={form.desconto_valor}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, desconto_valor: e.target.value }))
              }
            />
          </label>

          <label className="orcamento-item-editar-modal__field">
            <span>Desconto %</span>
            <input
              value={form.desconto_percentual}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  desconto_percentual: e.target.value,
                }))
              }
            />
          </label>

          <label className="orcamento-item-editar-modal__field orcamento-item-editar-modal__field--full">
            <span>Descrição do item</span>
            <input
              value={form.nome_customizado}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  nome_customizado: e.target.value,
                }))
              }
            />
          </label>
        </div>

        <div className="orcamento-item-editar-modal__actions">
          <button
            className="btn btn--secondary"
            type="button"
            onClick={onClose}
          >
            Cancelar
          </button>

          <button
            className="btn btn--primary"
            type="button"
            onClick={() =>
              onSave({
                ...item,
                quantidade: toNumber(form.quantidade),
                preco_unitario: toNumber(form.preco_unitario),
                desconto_valor: toNumber(form.desconto_valor),
                desconto_percentual: toNumber(form.desconto_percentual),
                nome_customizado: form.nome_customizado,
              })
            }
          >
            Salvar alterações
          </button>
        </div>
      </div>
    </div>
  );
}
