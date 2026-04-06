import { useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/Card';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import './style.css';

export default function Dashboard() {
  const [resumo, setResumo] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [entregas, setEntregas] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [r1, r2, r3] = await Promise.allSettled([
        api.get('/dashboard/resumo'),
        api.get('/dashboard/alertas'),
        api.get('/entregas/pendentes'),
      ]);
      if (r1.status === 'fulfilled') setResumo(r1.value.data || []);
      if (r2.status === 'fulfilled') setAlertas(r2.value.data || []);
      if (r3.status === 'fulfilled') setEntregas(r3.value.data || []);
    };
    load();
  }, []);

  return (
    <>
      <section className="dashboard__cards">
        {(resumo.length
          ? resumo
          : [
              { label: 'Produção Hoje', valor: '--' },
              { label: 'Vendas Abertas', valor: '--' },
              { label: 'Baixo Estoque', valor: '--' },
            ]
        ).map((item) => (
          <Card key={item.label} title={item.label}>
            <strong className="dashboard__metric">{item.valor}</strong>
          </Card>
        ))}
      </section>

      <Card title="Alertas operacionais">
        <ul className="dashboard__alerts">
          {(alertas.length
            ? alertas
            : ['Sem alertas críticos no momento.']
          ).map((alerta, idx) => (
            <li key={idx}>{alerta.mensagem || alerta}</li>
          ))}
        </ul>
      </Card>

      <Card title="Entregas pendentes">
        <DataTable
          columns={[
            { key: 'id', label: 'ID' },
            { key: 'cliente', label: 'Cliente' },
            { key: 'previsao', label: 'Previsão' },
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
  );
}
