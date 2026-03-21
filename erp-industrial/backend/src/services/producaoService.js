import { producaoRepository } from '../repositories/producaoRepository.js';
import { estoqueRepository } from '../repositories/estoqueRepository.js';
import { produtoRepository } from '../repositories/produtoRepository.js';
import { entregaRepository } from '../repositories/entregaRepository.js';
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

  async finalizar(ordemId, usuario_id) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 🔥 1. BUSCAR ORDEM (via repository)
      const ordem = await producaoRepository.getByIdWithClient(ordemId, client);

      if (!ordem) throw httpError('Ordem não encontrada', 404);

      if (ordem.status !== 'em_producao') {
        throw httpError('Ordem não está em produção');
      }

      // 🔥 2. COMPONENTES (AGORA COM CLIENT)
      const componentes = await produtoRepository.buscarComponentes(
        ordem.produto_id,
        client,
      );

      if (!componentes.length) {
        throw httpError('Produto não possui componentes cadastrados');
      }

      for (const comp of componentes) {
        const quantidade = parseFloat(comp.quantidade);
        const ordemQtd = parseFloat(ordem.quantidade);
        const total = quantidade * ordemQtd;

        const { rows } = await client.query(
          `SELECT tipo, nome FROM produtos WHERE id = $1`,
          [comp.componente_id],
        );

        const produtoComp = rows[0];

        if (!produtoComp) {
          throw httpError('Componente não encontrado');
        }

        // 🔥 só matéria-prima
        if (produtoComp.tipo === 'materia_prima') {
          const saldo = await estoqueRepository.getEstoqueAtual(
            comp.componente_id,
            client,
          );

          if (saldo < total) {
            throw httpError(`Estoque insuficiente para ${produtoComp.nome}`);
          }

          await estoqueRepository.criarMovimento(
            {
              produtoId: comp.componente_id,
              quantidade: -total,
              tipoMovimento: 'saida',
              referenciaTipo: 'producao_consumo',
              referenciaId: ordem.id,
            },
            client,
          );
        }
      }

      // 🔥 3. CRIAR ENTREGA (AGORA CERTO)
      await entregaRepository.criar(
        {
          ordem_producao_id: ordem.id,
          pedido_id: ordem.pedido_id || null,
          produto_id: ordem.produto_id,
          quantidade: parseFloat(ordem.quantidade),
          criado_por: usuario_id,
        },
        client,
      );

      // 🔥 4. FINALIZAR ORDEM (via repository)
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
