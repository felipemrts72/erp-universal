import { pool } from '../database/pool.js';

export const alertaService = {
  async listarAlertas() {
    const alertas = [];
    const baixoEstoque = await pool.query(
      `SELECT p.id, p.nome, p.estoque_minimo, COALESCE(SUM(m.quantidade),0) AS estoque
       FROM produtos p
       LEFT JOIN movimentos_estoque m ON m.produto_id = p.id
       GROUP BY p.id
       HAVING COALESCE(SUM(m.quantidade),0) < p.estoque_minimo`
    );
    baixoEstoque.rows.forEach((item) => {
      alertas.push({ tipo: 'estoque_baixo', mensagem: `${item.nome} abaixo do mínimo` });
    });

    const ordensParadas = await pool.query(
      `SELECT op.id, p.nome
       FROM ordens_producao op
       INNER JOIN produtos p ON p.id = op.produto_id
       WHERE op.status = 'aguardando_pecas'`
    );
    ordensParadas.rows.forEach((item) => {
      alertas.push({ tipo: 'producao_parada', mensagem: `Ordem ${item.id} (${item.nome}) aguardando peças` });
    });

    return alertas;
  }
};
