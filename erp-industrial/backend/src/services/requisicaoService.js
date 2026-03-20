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
       SET quantidade_atendida = COALESCE(quantidade_atendida,0) + $1,
           funcionario_id = $2
       WHERE id = $3
       RETURNING *`,
        [quantidade, funcionarioId, itemId],
      );

      const item = rows[0];

      // 🔥 2. descobrir tipo do produto
      const { rows: produtoRows } = await client.query(
        `SELECT tipo FROM produtos WHERE id = $1`,
        [item.produto_id],
      );

      const tipo = produtoRows[0].tipo;

      // 🔥 3. regra: só consumível baixa estoque
      if (tipo === 'consumivel') {
        await client.query(
          `INSERT INTO movimentos_estoque 
         (produto_id, quantidade, tipo_movimento, referencia_tipo, referencia_id)
         VALUES ($1,$2,'saida','consumo_requisicao',$3)`,
          [item.produto_id, -quantidade, itemId],
        );
      }

      // ✔ sempre registra consumo (auditoria)
      await client.query(
        `INSERT INTO consumos 
       (produto_id, funcionario_id, quantidade, tipo)
       VALUES ($1,$2,$3,'requisicao')`,
        [item.produto_id, funcionarioId, quantidade],
      );

      // 🔥 4. verificação de abuso (24h)
      const { rows: consumoRecente } = await client.query(
        `SELECT SUM(quantidade) as total
       FROM consumos
       WHERE produto_id = $1
       AND funcionario_id = $2
       AND criado_em >= NOW() - INTERVAL '24 HOURS'`,
        [item.produto_id, funcionarioId],
      );

      const total = Number(consumoRecente[0].total || 0);

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
