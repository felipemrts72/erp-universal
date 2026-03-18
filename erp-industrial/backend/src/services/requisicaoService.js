import { requisicaoRepository } from '../repositories/requisicaoRepository.js';
import { produtoRepository } from '../repositories/produtoRepository.js';
import { pool } from '../database/pool.js';

export const requisicaoService = {
  async criarParaOrdem(ordemProducaoId, quantidade) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. cria requisição
      const { rows } = await client.query(
        `INSERT INTO requisicoes_materiais (ordem_producao_id)
         VALUES ($1)
         RETURNING *`,
        [ordemProducaoId],
      );

      const requisicao = rows[0];

      // 2. buscar componentes do produto da OP
      const { rows: componentes } = await client.query(
        `SELECT cp.*, p.nome
         FROM componentes_produto cp
         JOIN produtos p ON p.id = cp.componente_id
         WHERE cp.produto_id = (
           SELECT produto_id FROM ordens_producao WHERE id = $1
         )`,
        [ordemProducaoId],
      );

      // 3. criar itens da requisição
      for (const comp of componentes) {
        const total = comp.quantidade * quantidade;

        await client.query(
          `INSERT INTO itens_requisicao 
           (requisicao_id, produto_id, quantidade_solicitada)
           VALUES ($1,$2,$3)`,
          [requisicao.id, comp.componente_id, total],
        );
      }

      await client.query('COMMIT');
      return requisicao;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async atenderItem(itemId, quantidade, funcionarioId) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. atualizar item
      const { rows } = await client.query(
        `UPDATE itens_requisicao
       SET quantidade_atendida = quantidade_atendida + $1,
           funcionario_id = $2
       WHERE id = $3
       RETURNING *`,
        [quantidade, funcionarioId, itemId],
      );

      const item = rows[0];

      // 2. registrar consumo
      await client.query(
        `INSERT INTO consumos 
       (produto_id, funcionario_id, quantidade, tipo)
       VALUES ($1,$2,$3,'requisicao')`,
        [item.produto_id, funcionarioId, quantidade],
      );

      // 3. verificar consumo recente (últimas 24h)
      const { rows: consumoRecente } = await client.query(
        `SELECT SUM(quantidade) as total
       FROM consumos
       WHERE produto_id = $1
       AND funcionario_id = $2
       AND criado_em >= NOW() - INTERVAL '24 HOURS'`,
        [item.produto_id, funcionarioId],
      );

      const total = Number(consumoRecente[0].total || 0);

      // 🔥 limite (você pode melhorar depois)
      const LIMITE = 10;

      let exigeJustificativa = false;

      if (total > LIMITE) {
        exigeJustificativa = true;

        await client.query(
          `UPDATE itens_requisicao
         SET exige_justificativa = true
         WHERE id = $1`,
          [itemId],
        );
      }

      await client.query('COMMIT');

      return {
        item,
        alerta: exigeJustificativa,
        mensagem: exigeJustificativa
          ? 'Consumo acima do normal, exigir justificativa'
          : null,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};
