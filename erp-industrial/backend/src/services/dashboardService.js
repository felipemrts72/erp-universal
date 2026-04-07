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
  async getFinanceiro() {
    const [
      vendasHoje,
      valorHoje,
      valorMes,
      qtdMes,
      entrada30Dias,
      topComprados,
    ] = await Promise.all([
      pool.query(`
        SELECT COUNT(*)::int AS total
        FROM vendas
        WHERE DATE(criado_em) = CURRENT_DATE
      `),

      pool.query(`
        SELECT COALESCE(SUM(iv.quantidade * iv.preco_unitario), 0) AS total
        FROM vendas v
        JOIN itens_vendas iv ON iv.venda_id = v.id
        WHERE DATE(v.criado_em) = CURRENT_DATE
      `),

      pool.query(`
        SELECT COALESCE(SUM(iv.quantidade * iv.preco_unitario), 0) AS total
        FROM vendas v
        JOIN itens_vendas iv ON iv.venda_id = v.id
        WHERE date_trunc('month', v.criado_em) = date_trunc('month', CURRENT_DATE)
      `),

      pool.query(`
        SELECT COUNT(*)::int AS total
        FROM vendas
        WHERE date_trunc('month', criado_em) = date_trunc('month', CURRENT_DATE)
      `),

      pool.query(`
        SELECT COALESCE(SUM(m.quantidade * COALESCE(p.ultimo_preco_compra, p.custo, 0)), 0) AS total
        FROM movimentos_estoque m
        JOIN produtos p ON p.id = m.produto_id
        WHERE m.tipo_movimento = 'entrada'
          AND m.criado_em >= NOW() - INTERVAL '30 days'
      `),

      pool.query(`
        SELECT
          p.nome AS produto,
          COALESCE(SUM(m.quantidade), 0) AS quantidade,
          COALESCE(SUM(m.quantidade * COALESCE(p.ultimo_preco_compra, p.custo, 0)), 0) AS valor_total
        FROM movimentos_estoque m
        JOIN produtos p ON p.id = m.produto_id
        WHERE m.tipo_movimento = 'entrada'
          AND m.criado_em >= NOW() - INTERVAL '30 days'
        GROUP BY p.id, p.nome
        ORDER BY valor_total DESC, quantidade DESC
        LIMIT 5
      `),
    ]);

    return {
      quantidadeVendasHoje: vendasHoje.rows[0]?.total || 0,
      valorVendasHoje: Number(valorHoje.rows[0]?.total || 0),
      valorVendasMes: Number(valorMes.rows[0]?.total || 0),
      quantidadeVendasMes: qtdMes.rows[0]?.total || 0,
      entradaEstoque30Dias: Number(entrada30Dias.rows[0]?.total || 0),
      topItensComprados: topComprados.rows || [],
    };
  },
};
