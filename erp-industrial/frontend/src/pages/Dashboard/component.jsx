import { useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/Card';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
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

export default function Dashboard() {
  const [financeiro, setFinanceiro] = useState(null);
  const [modoDashboard, setModoDashboard] = useState('estoque');

  const token = localStorage.getItem('token');
  const user = token ? parseJwt(token) : {};
  const isAdmin = user?.role === 'admin';

  const [resumo, setResumo] = useState(null);
  const [alertas, setAlertas] = useState([]);
  const [entregas, setEntregas] = useState([]);

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

          <Card title='Alertas operacionais'>
            <ul className='dashboard__alerts'>
              {(alertas.length
                ? alertas
                : ['Sem alertas críticos no momento.']
              ).map((alerta, idx) => (
                <li key={idx}>{alerta.mensagem || alerta}</li>
              ))}
            </ul>
          </Card>

          <Card title='Entregas pendentes'>
            <DataTable
              columns={[
                { key: 'id', label: 'ID' },
                {
                  key: 'produto_nome',
                  label: 'Produto',
                  render: (_, row) => row.produto_nome || '-',
                },
                {
                  key: 'criado_em',
                  label: 'Criado em',
                  render: (_, row) =>
                    row.criado_em
                      ? new Date(row.criado_em).toLocaleDateString('pt-BR')
                      : '-',
                },
                {
                  key: 'status',
                  label: 'Status',
                  render: (_, row) => (
                    <StatusBadge status={row.status || 'Pendente'} />
                  ),
                },
              ]}
              rows={entregas}
            />
          </Card>
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
    </>
  );
}
