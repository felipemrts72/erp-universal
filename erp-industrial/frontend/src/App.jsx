import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import ProdutosPage from './pages/ProdutosPage';
import EstoquePage from './pages/EstoquePage';
import OrcamentosPage from './pages/OrcamentosPage';
import PedidosPage from './pages/PedidosPage';
import ProducaoPage from './pages/ProducaoPage';
import RelatoriosPage from './pages/RelatoriosPage';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/produtos" element={<ProdutosPage />} />
          <Route path="/estoque" element={<EstoquePage />} />
          <Route path="/orcamentos" element={<OrcamentosPage />} />
          <Route path="/pedidos" element={<PedidosPage />} />
          <Route path="/producao" element={<ProducaoPage />} />
          <Route path="/relatorios" element={<RelatoriosPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
