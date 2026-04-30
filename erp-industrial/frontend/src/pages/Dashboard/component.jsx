import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Card from '../../components/Card';
import './style.css';

function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return {};
  }
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('pt-BR');
}

export default function Dashboard() {
  const [financeiro, setFinanceiro] = useState(null);
  const [modoDashboard, setModoDashboard] = useState('estoque');

  const token = localStorage.getItem('token');
  const user = token ? parseJwt(token) : {};
  const isAdmin = user?.role === 'admin';

  const [resumo, setResumo] = useState(null);
  const [alertas, setAlertas] = useState([]);
  const [entregas, setEntregas] = useState([]);

  const [modalAlertasOpen, setModalAlertasOpen] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const requests = [
        api.get('/dashboard/resumo'),
        api.get('/dashboard/alertas'),
        api.get('/entregas/pendentes'),
      ];

      if (isAdmin) {
        requests.push(api.get('/dashboard/financeiro'));
      }

      const results = await Promise.allSettled(requests);

      const [r1, r2, r3, r4] = results;

      if (r1?.status === 'fulfilled') setResumo(r1.value.data || null);
      if (r2?.status === 'fulfilled') setAlertas(r2.value.data || []);
      if (r3?.status === 'fulfilled') setEntregas(r3.value.data || []);
      if (r4?.status === 'fulfilled') setFinanceiro(r4.value.data || null);
    };

    load();
  }, [isAdmin]);

  return (
    <>
      {isAdmin && (
        <div className='dashboard__toggle'>
          <button
            className={`btn ${modoDashboard === 'estoque' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setModoDashboard('estoque')}
            type='button'
          >
            Estoque
          </button>

          <button
            className={`btn ${modoDashboard === 'financeiro' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setModoDashboard('financeiro')}
            type='button'
          >
            Financeiro
          </button>
        </div>
      )}
      {modoDashboard === 'estoque' ? (
        <>
          <section className='dashboard__cards'>
            {[
              {
                label: 'Produção em andamento',
                valor: resumo?.producaoEmAndamento ?? '--',
              },
              {
                label: 'Vendas abertas',
                valor: resumo?.vendasAbertas ?? '--',
              },
              {
                label: 'Itens para comprar',
                valor: resumo?.itensParaComprar ?? '--',
              },
            ].map((item) => (
              <Card key={item.label} title={item.label}>
                <strong className='dashboard__metric'>{item.valor}</strong>
              </Card>
            ))}
          </section>

          <div
            className='dashboard-alert-card'
            onClick={() => setModalAlertasOpen(true)}
            role='button'
            tabIndex={0}
          >
            <div>
              <span className='dashboard-alert-card__label'>
                Alertas operacionais
              </span>

              <strong>
                {alertas.length
                  ? `${alertas.length} itens estão abaixo do mínimo`
                  : 'Nenhum item abaixo do mínimo'}
              </strong>
            </div>

            <span className='dashboard-alert-card__action'>Ver relatório</span>
          </div>

          <div className='dashboard-section'>
            <h2>Vendas pendentes</h2>

            <div className='dashboard-sales-grid'>
              {entregas.length ? (
                entregas.map((entrega) => (
                  <article
                    key={entrega.id}
                    className='dashboard-sale-card'
                    onClick={() => navigate('/vendas')}
                    role='button'
                    tabIndex={0}
                  >
                    <div className='dashboard-sale-card__top'>
                      <strong>Venda #{entrega.venda_id || entrega.id}</strong>
                      <span>{entrega.status || 'pendente'}</span>
                    </div>

                    <div className='dashboard-sale-card__info'>
                      <small>Cliente</small>
                      <strong>{entrega.cliente_nome || '-'}</strong>
                    </div>

                    <div className='dashboard-sale-card__grid'>
                      <div>
                        <small>Criada em</small>
                        <strong>{formatDate(entrega.criado_em)}</strong>
                      </div>

                      <div>
                        <small>Entrega</small>
                        <strong>{formatDate(entrega.prazo_entrega)}</strong>
                      </div>

                      <div>
                        <small>Valor</small>
                        <strong>
                          {entrega.valor_liquido || entrega.valor_total
                            ? formatMoney(
                                entrega.valor_liquido || entrega.valor_total,
                              )
                            : 'Ver em vendas'}
                        </strong>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className='dashboard-empty'>Nenhuma venda pendente.</div>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <section className='dashboard__cards'>
            {[
              {
                label: 'Vendas do dia',
                valor: financeiro?.quantidadeVendasHoje ?? '--',
              },
              {
                label: 'Valor vendido hoje',
                valor:
                  financeiro?.valorVendasHoje != null
                    ? formatMoney(financeiro.valorVendasHoje)
                    : '--',
              },
              {
                label: 'Valor vendido no mês',
                valor:
                  financeiro?.valorVendasMes != null
                    ? formatMoney(financeiro.valorVendasMes)
                    : '--',
              },
              {
                label: 'Quantidade vendas no mês',
                valor: financeiro?.quantidadeVendasMes ?? '--',
              },
              {
                label: 'Entrada estoque 30 dias',
                valor:
                  financeiro?.entradaEstoque30Dias != null
                    ? formatMoney(financeiro.entradaEstoque30Dias)
                    : '--',
              },
            ].map((item) => (
              <Card key={item.label} title={item.label}>
                <strong className='dashboard__metric'>{item.valor}</strong>
              </Card>
            ))}
          </section>

          <Card title='Itens mais comprados (30 dias)'>
            <DataTable
              columns={[
                { key: 'produto', label: 'Produto' },
                { key: 'quantidade', label: 'Qtd.' },
                {
                  key: 'valor_total',
                  label: 'Valor total',
                  render: (_, row) => formatMoney(row.valor_total),
                },
              ]}
              rows={financeiro?.topItensComprados || []}
              emptyText='Nenhum item comprado no período.'
            />
          </Card>
        </>
      )}
      {modalAlertasOpen && (
        <div className='dashboard-modal'>
          <div
            className='dashboard-modal__backdrop'
            onClick={() => setModalAlertasOpen(false)}
          />

          <div className='dashboard-modal__card'>
            <div className='dashboard-modal__header'>
              <h2>Itens abaixo do mínimo</h2>

              <button
                type='button'
                className='dashboard-modal__close'
                onClick={() => setModalAlertasOpen(false)}
              >
                ×
              </button>
            </div>

            <div className='dashboard-alert-list'>
              {alertas.length ? (
                alertas.map((alerta, index) => (
                  <div key={index} className='dashboard-alert-item'>
                    <strong>
                      {alerta.produto_nome ||
                        alerta.nome ||
                        alerta.mensagem ||
                        alerta}
                    </strong>
                  </div>
                ))
              ) : (
                <p>Nenhum item abaixo do mínimo.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
