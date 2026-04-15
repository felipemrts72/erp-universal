import { reservaVendaRepository } from '../repositories/reservaVendaRepository.js';
import { estoqueRepository } from '../repositories/estoqueRepository.js';
import { httpError } from '../utils/httpError.js';
import { pool } from '../database/pool.js';

export const reservaVendaService = {
  async reservarEntradasPendentes(produto_id, client = pool) {
    if (!produto_id) return { reservasCriadas: 0 };

    const saldoFisico = await estoqueRepository.getEstoqueAtual(
      produto_id,
      client,
    );
    const reservadoTotal =
      await reservaVendaRepository.getReservadoAtivoPorProduto(
        produto_id,
        client,
      );

    let disponivel = Math.max(Number(saldoFisico) - Number(reservadoTotal), 0);

    if (disponivel <= 0) {
      return { reservasCriadas: 0 };
    }

    const pendencias = await reservaVendaRepository.listarPendenciasPorProduto(
      produto_id,
      client,
    );

    let reservasCriadas = 0;

    for (const pendencia of pendencias) {
      if (disponivel <= 0) break;

      const faltante = Number(pendencia.faltante || 0);
      if (faltante <= 0) continue;

      const quantidadeReservar = Math.min(disponivel, faltante);

      await reservaVendaRepository.criar(
        {
          venda_id: pendencia.venda_id,
          produto_id,
          quantidade: quantidadeReservar,
          origem_movimento_id: null,
          status: 'reservado',
        },
        client,
      );

      disponivel -= quantidadeReservar;
      reservasCriadas += 1;
    }

    return { reservasCriadas };
  },
  async vincularEntradaNaVenda({
    venda_id,
    produto_id,
    quantidade,
    custoUnitario,
    fornecedor,
    usuario_id,
  }) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      if (!venda_id) throw httpError('Venda obrigatória', 400);
      if (!produto_id) throw httpError('Produto obrigatório', 400);
      if (!quantidade || Number(quantidade) <= 0) {
        throw httpError('Quantidade inválida', 400);
      }
      if (!custoUnitario || Number(custoUnitario) <= 0) {
        throw httpError('Custo unitário inválido', 400);
      }
      if (!fornecedor || !String(fornecedor).trim()) {
        throw httpError('Fornecedor obrigatório', 400);
      }
      if (!usuario_id) {
        throw httpError('Usuário obrigatório', 400);
      }

      const pendencia = await reservaVendaRepository.buscarPendencia(
        venda_id,
        produto_id,
      );

      if (!pendencia) {
        throw httpError('Pendência da venda não encontrada', 404);
      }

      if (Number(pendencia.faltante) <= 0) {
        throw httpError(
          'Essa venda já está totalmente atendida para esse produto',
          400,
        );
      }

      if (Number(quantidade) > Number(pendencia.faltante)) {
        throw httpError(
          `A quantidade informada é maior que o faltante da venda. Faltante atual: ${pendencia.faltante}`,
          400,
        );
      }

      const saldoAtual = await estoqueRepository.getEstoqueAtual(
        produto_id,
        client,
      );

      const { rows: produtoRows } = await client.query(
        'SELECT custo FROM produtos WHERE id = $1',
        [produto_id],
      );

      if (!produtoRows.length) {
        throw httpError('Produto não encontrado', 404);
      }

      const custoAtual = Number(produtoRows[0].custo || 0);
      const qtd = Number(quantidade);
      const custo = Number(custoUnitario || 0);

      const novoCusto =
        saldoAtual === 0
          ? custo
          : (custoAtual * saldoAtual + custo * qtd) / (saldoAtual + qtd);

      await client.query(
        `
        UPDATE produtos
        SET custo = $1,
            ultimo_preco_compra = $2
        WHERE id = $3
        `,
        [novoCusto, custo, produto_id],
      );

      const movimento = await estoqueRepository.criarMovimento(
        {
          produtoId: produto_id,
          quantidade: qtd,
          tipoMovimento: 'entrada',
          referenciaTipo: 'compra_vinculada',
          referenciaId: venda_id,
        },
        client,
      );

      await reservaVendaRepository.criar(
        {
          venda_id,
          produto_id,
          quantidade: qtd,
          origem_movimento_id: movimento?.id || null,
          status: 'reservado',
        },
        client,
      );

      await client.query('COMMIT');

      return { message: 'Entrada vinculada à venda com sucesso' };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async listarPendentesCompra() {
    return reservaVendaRepository.listarPendentesCompra();
  },

  async getReservadoPorProduto(produto_id, client = pool) {
    const { rows } = await client.query(
      `
    SELECT COALESCE(SUM(quantidade), 0) AS total
    FROM reservas_venda
    WHERE produto_id = $1
      AND status = 'reservado'
    `,
      [produto_id],
    );

    return Number(rows[0]?.total || 0);
  },

  async listarPendenciasPorProduto(produto_id, client = pool) {
    const { rows } = await client.query(
      `
    SELECT
      iv.venda_id,
      iv.produto_id,
      iv.quantidade AS quantidade_vendida,
      COALESCE(rv.quantidade_reservada, 0) AS quantidade_reservada,
      GREATEST(iv.quantidade - COALESCE(rv.quantidade_reservada, 0), 0) AS faltante
    FROM itens_vendas iv
    JOIN vendas v ON v.id = iv.venda_id
    LEFT JOIN (
      SELECT
        venda_id,
        produto_id,
        COALESCE(SUM(quantidade), 0) AS quantidade_reservada
      FROM reservas_venda
      WHERE status = 'reservado'
      GROUP BY venda_id, produto_id
    ) rv
      ON rv.venda_id = iv.venda_id
     AND rv.produto_id = iv.produto_id
    WHERE iv.produto_id = $1
      AND v.status IN ('aberto', 'parcial')
      AND GREATEST(iv.quantidade - COALESCE(rv.quantidade_reservada, 0), 0) > 0
    ORDER BY v.criado_em ASC, iv.venda_id ASC
    `,
      [produto_id],
    );

    return rows;
  },
};
