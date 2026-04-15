import { producaoRepository } from '../repositories/producaoRepository.js';
import { estoqueRepository } from '../repositories/estoqueRepository.js';
import { produtoRepository } from '../repositories/produtoRepository.js';
import { entregaRepository } from '../repositories/entregaRepository.js';
import { reservaVendaRepository } from '../repositories/reservaVendaRepository.js';
import { vendaRepository } from '../repositories/vendaRepository.js';
import { httpError } from '../utils/httpError.js';
import { pool } from '../database/pool.js';

export const producaoService = {
  async createOrdem(payload) {
    if (!payload.produtoId) {
      throw httpError('Produto é obrigatório', 400);
    }

    if (!payload.quantidade || Number(payload.quantidade) <= 0) {
      throw httpError('Quantidade inválida', 400);
    }

    return producaoRepository.createOrdem({
      produtoId: payload.produtoId,
      vendaId: payload.vendaId || null,
      quantidade: Number(payload.quantidade),
      status: payload.status || 'pendente',
    });
  },

  async list() {
    return producaoRepository.list();
  },

  async iniciar(ordemId) {
    const ordem = await producaoRepository.getById(ordemId);

    if (!ordem) {
      throw httpError('Ordem não encontrada', 404);
    }

    if (ordem.status !== 'pendente') {
      throw httpError('Somente ordens pendentes podem ser iniciadas', 400);
    }

    return producaoRepository.updateStatus(ordemId, 'em_producao');
  },

  async finalizar(ordemId, usuario_id) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const ordem = await producaoRepository.getByIdWithClient(ordemId, client);

      if (!ordem) {
        throw httpError('Ordem não encontrada', 404);
      }

      if (ordem.status !== 'em_producao') {
        throw httpError('Ordem não está em produção', 400);
      }

      const componentes = await produtoRepository.buscarComponentes(
        ordem.produto_id,
        client,
      );

      if (!componentes.length) {
        throw httpError('Produto não possui componentes cadastrados', 400);
      }

      for (const comp of componentes) {
        const quantidadeComponente = Number(comp.quantidade || 0);
        const quantidadeOrdem = Number(ordem.quantidade || 0);
        const totalConsumir = quantidadeComponente * quantidadeOrdem;

        const { rows } = await client.query(
          `SELECT tipo, nome
           FROM produtos
           WHERE id = $1`,
          [comp.componente_id],
        );

        const produtoComp = rows[0];

        if (!produtoComp) {
          throw httpError('Componente não encontrado', 404);
        }

        if (produtoComp.tipo === 'materia_prima') {
          const saldo = await estoqueRepository.getEstoqueAtual(
            comp.componente_id,
            client,
          );

          if (saldo < totalConsumir) {
            throw httpError(
              `Estoque insuficiente para ${produtoComp.nome}`,
              400,
            );
          }

          await estoqueRepository.criarMovimento(
            {
              produtoId: comp.componente_id,
              quantidade: -totalConsumir,
              tipoMovimento: 'saida',
              referenciaTipo: 'producao_consumo',
              referenciaId: ordem.id,
            },
            client,
          );
        }
      }

      await estoqueRepository.criarMovimento(
        {
          produtoId: ordem.produto_id,
          quantidade: Number(ordem.quantidade),
          tipoMovimento: 'entrada',
          referenciaTipo: 'producao_finalizada',
          referenciaId: ordem.id,
        },
        client,
      );

      if (ordem.venda_id) {
        const pendencia = await client.query(
          `
          SELECT
            iv.quantidade AS quantidade_vendida,
            COALESCE(rv.total_reservado, 0) AS quantidade_reservada,
            GREATEST(iv.quantidade - COALESCE(rv.total_reservado, 0), 0) AS faltante
          FROM itens_vendas iv
          LEFT JOIN (
            SELECT
              venda_id,
              produto_id,
              SUM(quantidade) AS total_reservado
            FROM reservas_venda
            WHERE status = 'reservado'
            GROUP BY venda_id, produto_id
          ) rv
            ON rv.venda_id = iv.venda_id
           AND rv.produto_id = iv.produto_id
          WHERE iv.venda_id = $1
            AND iv.produto_id = $2
          LIMIT 1
          `,
          [ordem.venda_id, ordem.produto_id],
        );

        const faltante = Number(pendencia.rows[0]?.faltante || 0);
        const quantidadeReservar = Math.min(
          Number(ordem.quantidade),
          Math.max(faltante, 0),
        );

        if (quantidadeReservar > 0) {
          await reservaVendaRepository.criar(
            {
              venda_id: ordem.venda_id,
              produto_id: ordem.produto_id,
              quantidade: quantidadeReservar,
              origem_movimento_id: null,
              status: 'reservado',
            },
            client,
          );
        }
      }

      await producaoRepository.finalizar(ordemId, client);

      await client.query('COMMIT');

      return { message: 'Produção finalizada com sucesso' };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};
