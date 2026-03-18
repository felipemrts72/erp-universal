import { useFetch } from '../hooks/useFetch';
import { Card } from '../components/Card';

export default function DashboardPage() {
  const { data, loading } = useFetch('/dashboard');
  if (loading) return <p>Carregando...</p>;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card title="Produção em andamento">
        <p className="text-3xl font-bold">{data.producaoEmAndamento}</p>
      </Card>
      <Card title="Alertas">
        <ul className="list-disc pl-5 text-sm">
          {data.alertas?.map((a, i) => <li key={i}>{a.mensagem}</li>)}
        </ul>
      </Card>
      <Card title="Pedidos recentes">
        <ul className="text-sm">{data.pedidosRecentes?.map((p) => <li key={p.id}>Pedido #{p.id} - {p.cliente_nome}</li>)}</ul>
      </Card>
      <Card title="Produtos com estoque baixo">
        <ul className="text-sm">{data.produtosComEstoqueBaixo?.map((p, i) => <li key={i}>{p.nome} ({p.estoque})</li>)}</ul>
      </Card>
    </div>
  );
}
