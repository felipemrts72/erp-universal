import { pool } from '../database/pool.js';
import { alertaService } from './alertaService.js';

export const dashboardService = {
  async getResumo() {
    const [producao, vendasAbertas, itensParaComprar, alertas] =
      await Promise.all([
        pool.query(
          `SELECT COUNT(*)::int AS total
           FROM ordens_producao
           WHERE status IN ('pendente','em_producao','aguardando_pecas')`,
        ),
        pool.query(
          `SELECT COUNT(*)::int AS total
           FROM vendas
           WHERE status IN ('aberto', 'parcial')`,
        ),
        pool.query(
          `
          SELECT COUNT(*)::int AS total
          FROM (
            SELECT
              iv.produto_id,
              GREATEST(
                SUM(iv.quantidade) - COALESCE(SUM(rv.quantidade_reservada), 0),
                0
              ) AS faltante_venda
            FROM itens_vendas iv
            JOIN vendas v ON v.id = iv.venda_id
            LEFT JOIN (
              SELECT
                venda_id,
                produto_id,
                SUM(quantidade) AS quantidade_reservada
              FROM reservas_venda
              WHERE status = 'reservado'
              GROUP BY venda_id, produto_id
            ) rv
              ON rv.venda_id = iv.venda_id
             AND rv.produto_id = iv.produto_id
            WHERE v.status IN ('aberto', 'parcial')
            GROUP BY iv.produto_id
          ) x
          WHERE x.faltante_venda > 0
          `,
        ),
        alertaService.listarAlertas(),
      ]);

    return {
      producaoEmAndamento: producao.rows[0]?.total || 0,
      vendasAbertas: vendasAbertas.rows[0]?.total || 0,
      itensParaComprar: itensParaComprar.rows[0]?.total || 0,
      alertas,
    };
  },
};
