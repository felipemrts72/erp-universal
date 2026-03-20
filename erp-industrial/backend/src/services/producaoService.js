import { producaoRepository } from '../repositories/producaoRepository.js';
import { estoqueRepository } from '../repositories/estoqueRepository.js';
import { produtoRepository } from '../repositories/produtoRepository.js';
import { httpError } from '../utils/httpError.js';
import { pool } from '../database/pool.js';

export const producaoService = {
  async createOrdem(payload) {
    return producaoRepository.createOrdem(payload);
  },

  async list() {
    return producaoRepository.list();
  },

  async iniciar(ordemId) {
    const ordem = await producaoRepository.getById(ordemId);
    if (!ordem) throw httpError('Ordem não encontrada', 404);

    if (ordem.status !== 'pendente') {
      throw httpError('Ordem não pode ser iniciada');
    }

    return producaoRepository.updateStatus(ordemId, 'em_producao');
  },

  async finalizar(ordemId) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const ordem = await producaoRepository.getById(ordemId);
      if (!ordem) throw httpError('Ordem não encontrada', 404);

      // 🔥 1. Buscar componentes
      const componentes = await produtoRepository.buscarComponentes(
        ordem.produto_id,
      );

      // 🔥 2. Dar baixa APENAS matéria-prima
      for (const comp of componentes) {
        const total = Number(comp.quantidade) * Number(ordem.quantidade);

        // 🔥 pegar tipo + nome
        const { rows: produtoRows } = await client.query(
          `SELECT tipo, nome FROM produtos WHERE id = $1`,
          [comp.componente_id],
        );

        const produtoComp = produtoRows[0];

        // 🔥 só matéria-prima
        if (produtoComp.tipo === 'materia_prima') {
          // 🔥 VALIDAÇÃO DE ESTOQUE AQUI
          const saldo = await estoqueRepository.getEstoqueAtual(
            comp.componente_id,
            client,
          );

          if (saldo < total) {
            throw httpError(`Estoque insuficiente para ${produtoComp.nome}`);
          }

          // 🔥 baixa estoque
          await client.query(
            `INSERT INTO movimentos_estoque
       (produto_id, quantidade, tipo_movimento, referencia_tipo, referencia_id)
       VALUES ($1,$2,'saida','producao_consumo',$3)`,
            [comp.componente_id, -total, ordem.id],
          );
        }
      }

      // 🔥 3. Entrada do produto final
      await client.query(
        `INSERT INTO movimentos_estoque
       (produto_id, quantidade, tipo_movimento, referencia_tipo, referencia_id)
       VALUES ($1,$2,'entrada','ordem_producao_finalizada',$3)`,
        [ordem.produto_id, Number(ordem.quantidade), ordem.id],
      );

      // 🔥 4. Atualizar status
      const result = await producaoRepository.updateStatus(
        ordemId,
        'finalizado',
      );

      await client.query('COMMIT');

      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};
