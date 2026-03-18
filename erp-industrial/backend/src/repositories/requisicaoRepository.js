import { pool } from '../database/pool.js';

export const requisicaoRepository = {
  async create(ordemProducaoId) {
    const { rows } = await pool.query(
      `INSERT INTO requisicoes_materiais (ordem_producao_id)
       VALUES ($1)
       RETURNING *`,
      [ordemProducaoId],
    );
    return rows[0];
  },

  async addItem({
    requisicaoId,
    produtoId,
    quantidadeSolicitada,
    motivoExtra,
  }) {
    const { rows } = await pool.query(
      `INSERT INTO itens_requisicao 
       (requisicao_id, produto_id, quantidade_solicitada, motivo_extra)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [requisicaoId, produtoId, quantidadeSolicitada, motivoExtra || null],
    );
    return rows[0];
  },

  async atenderItem({ itemId, quantidadeAtendida }) {
    const { rows } = await pool.query(
      `UPDATE itens_requisicao
       SET quantidade_atendida = quantidade_atendida + $1
       WHERE id = $2
       RETURNING *`,
      [quantidadeAtendida, itemId],
    );
    return rows[0];
  },
};
