import { pool } from '../database/pool.js';
import { orcamentoMetaRepository } from './orcamentoMetaRepository.js';

export const orcamentoRepository = {
  async create({ clienteNome, itens }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const orcamento = await client.query(
        `INSERT INTO orcamentos (cliente_nome) VALUES ($1) RETURNING *`,
        [clienteNome]
      );

      const itensCriados = [];
      for (const item of itens) {
        const insert = await client.query(
          `INSERT INTO itens_orcamento (orcamento_id, produto_id, quantidade, preco_unitario)
           VALUES ($1,$2,$3,$4)
           RETURNING *`,
          [
            orcamento.rows[0].id,
            item.produto_id,
            item.quantidade,
            item.preco_customizado ?? item.preco_unitario
          ]
        );
        itensCriados.push(insert.rows[0]);
      }
      await client.query('COMMIT');

      for (let i = 0; i < itensCriados.length; i += 1) {
        if (itens[i].nome_customizado) {
          await orcamentoMetaRepository.salvarNomeCustomizado(itensCriados[i].id, itens[i].nome_customizado);
        }
      }

      return { ...orcamento.rows[0], itens: itensCriados };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async list() {
    const { rows } = await pool.query('SELECT * FROM orcamentos ORDER BY id DESC');
    return rows;
  },

  async getWithItens(id) {
    const { rows } = await pool.query('SELECT * FROM orcamentos WHERE id=$1', [id]);
    if (!rows[0]) return null;
    const itens = await pool.query('SELECT * FROM itens_orcamento WHERE orcamento_id=$1', [id]);
    const nomesMap = await orcamentoMetaRepository.mapearNomes(itens.rows.map((i) => i.id));
    return {
      ...rows[0],
      itens: itens.rows.map((item) => ({ ...item, nome_customizado: nomesMap[item.id] }))
    };
  },

  async updateStatus(id, status) {
    const { rows } = await pool.query('UPDATE orcamentos SET status=$1 WHERE id=$2 RETURNING *', [status, id]);
    return rows[0];
  }
};
