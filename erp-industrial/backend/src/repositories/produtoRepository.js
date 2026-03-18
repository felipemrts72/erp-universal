import { pool } from '../database/pool.js';

export const produtoRepository = {
  async create(data, client = pool) {
    const { nome, tipo, sku, estoqueMinimo, precoVenda, custo, unidadeMedida } =
      data;

    const { rows } = await client.query(
      `INSERT INTO produtos 
      (nome, tipo, sku, estoque_minimo, preco_venda, custo, unidade_medida)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *`,
      [
        nome,
        tipo,
        sku || null,
        estoqueMinimo || 0,
        precoVenda || 0,
        custo || 0,
        unidadeMedida || 'UN',
      ],
    );

    return rows[0];
  },

  async list() {
    const { rows } = await pool.query(
      'SELECT * FROM produtos ORDER BY id DESC',
    );
    return rows;
  },

  async addComponente({ produtoId, componenteId, quantidade }, client = pool) {
    const { rows } = await client.query(
      `INSERT INTO componentes_produto (produto_id, componente_id, quantidade)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [produtoId, componenteId, quantidade],
    );
    return rows[0];
  },

  async getById(id) {
    const { rows } = await pool.query('SELECT * FROM produtos WHERE id = $1', [
      id,
    ]);
    return rows[0];
  },

  async buscarComponentes(produtoId) {
    const { rows } = await pool.query(
      `SELECT cp.*, p.nome AS componente_nome
       FROM componentes_produto cp
       INNER JOIN produtos p ON p.id = cp.componente_id
       WHERE cp.produto_id = $1`,
      [produtoId],
    );
    return rows;
  },

  async buscarPorNome(nome) {
    const { rows } = await pool.query(
      'SELECT * FROM produtos WHERE nome ILIKE $1 LIMIT 10',
      [`%${nome}%`],
    );
    return rows;
  },
};
