import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import MainLayout from '../layouts/MainLayout';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Produtos from '../pages/Produtos';
import Estoque from '../pages/Estoque';
import Producao from '../pages/Producao';
import Orcamentos from '../pages/Orcamentos';
import Vendas from '../pages/Vendas';
import Consumiveis from '../pages/Consumiveis';
import Funcionarios from '../pages/Funcionarios';
import Entregas from '../pages/Entregas';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/produtos" element={<Produtos />} />
          <Route path="/estoque" element={<Estoque />} />
          <Route path="/producao" element={<Producao />} />
          <Route path="/orcamentos" element={<Orcamentos />} />
          <Route path="/vendas" element={<Vendas />} />
          <Route path="/consumiveis" element={<Consumiveis />} />
          <Route path="/funcionarios" element={<Funcionarios />} />
          <Route path="/entregas" element={<Entregas />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
