import { pool } from '../database/pool.js';
import { auditoriaRepository } from './auditoriaRepository.js';

export const estoqueRepository = {
  async getEstoqueAtual(produtoId) {
    const { rows } = await pool.query(
      'SELECT COALESCE(SUM(quantidade),0) AS saldo FROM movimentos_estoque WHERE produto_id = $1',
      [produtoId]
    );
    return Number(rows[0].saldo);
  },

  async criarMovimentoEstoque({ produtoId, quantidade, tipoMovimento, referenciaTipo, referenciaId }) {
    const { rows } = await pool.query(
      `INSERT INTO movimentos_estoque (produto_id, quantidade, tipo_movimento, referencia_tipo, referencia_id)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [produtoId, quantidade, tipoMovimento, referenciaTipo || null, referenciaId || null]
    );
    return rows[0];
  },

  async registrarAuditoria(payload) {
    return auditoriaRepository.registrarAuditoria(payload);
  },

  async listarResumoEstoque() {
    const { rows } = await pool.query(
      `SELECT p.id AS produto_id, p.nome AS produto, p.estoque_minimo,
              COALESCE(SUM(m.quantidade),0) AS quantidade_atual,
              CASE WHEN COALESCE(SUM(m.quantidade),0) < p.estoque_minimo THEN 'baixo' ELSE 'ok' END AS status
       FROM produtos p
       LEFT JOIN movimentos_estoque m ON m.produto_id = p.id
       GROUP BY p.id
       ORDER BY p.nome`
    );
    return rows;
  }
};
