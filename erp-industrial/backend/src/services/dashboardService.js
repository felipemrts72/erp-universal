import { pool } from '../database/pool.js';
import { alertaService } from './alertaService.js';

export const dashboardService = {
  async getResumo() {
    const [producao, pedidos, baixos, alertas] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS total FROM ordens_producao WHERE status IN ('pendente','em_producao','aguardando_pecas')`),
      pool.query(`SELECT * FROM pedidos ORDER BY id DESC LIMIT 5`),
      pool.query(
        `SELECT p.nome, COALESCE(SUM(m.quantidade),0) AS estoque
         FROM produtos p LEFT JOIN movimentos_estoque m ON m.produto_id = p.id
         GROUP BY p.id HAVING COALESCE(SUM(m.quantidade),0) < p.estoque_minimo
         ORDER BY estoque ASC LIMIT 5`
      ),
      alertaService.listarAlertas()
    ]);

    return {
      producaoEmAndamento: producao.rows[0].total,
      pedidosRecentes: pedidos.rows,
      produtosComEstoqueBaixo: baixos.rows,
      alertas
    };
  }
};
