import { pool } from '../database/pool.js';

function buildSearchTerm(q) {
  return `%${String(q || '').trim()}%`;
}

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
        precoVenda ?? null,
        custo ?? 0,
        unidadeMedida || 'UN',
      ],
    );

    return rows[0];
  },

  async list() {
    const { rows } = await pool.query(`
    SELECT 
      p.*,
      COALESCE(
        json_agg(
          json_build_object(
            'componente_id', cp.componente_id,
            'nome', c.nome,
            'quantidade', cp.quantidade
          )
        ) FILTER (WHERE cp.id IS NOT NULL),
        '[]'
      ) AS componentes
    FROM produtos p
    LEFT JOIN componentes_produto cp ON cp.produto_id = p.id
    LEFT JOIN produtos c ON c.id = cp.componente_id
    GROUP BY p.id
    ORDER BY p.id DESC
  `);

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
    const { rows } = await pool.query(
      `
      SELECT 
        p.*,
        COALESCE(
          json_agg(
            json_build_object(
              'componente_id', cp.componente_id,
              'nome', c.nome,
              'quantidade', cp.quantidade,
              'custo', c.custo
            )
          ) FILTER (WHERE cp.id IS NOT NULL),
          '[]'
        ) AS componentes
      FROM produtos p
      LEFT JOIN componentes_produto cp ON cp.produto_id = p.id
      LEFT JOIN produtos c ON c.id = cp.componente_id
      WHERE p.id = $1
      GROUP BY p.id
      `,
      [id],
    );

    return rows[0] || null;
  },

  async buscarComponentes(produtoId, client = pool) {
    const { rows } = await client.query(
      `SELECT 
       cp.*,
       p.nome AS componente_nome,
       p.tipo AS componente_tipo,
       p.unidade_medida,
       p.estoque_minimo
     FROM componentes_produto cp
     INNER JOIN produtos p ON p.id = cp.componente_id
     WHERE cp.produto_id = $1`,
      [produtoId],
    );

    return rows;
  },

  async buscarPorNome(nome) {
    const termo = buildSearchTerm(nome);

    const { rows } = await pool.query(
      `
    SELECT *
    FROM produtos
    WHERE unaccent(lower(nome)) LIKE unaccent(lower($1))
    LIMIT 10
    `,
      [termo],
    );

    return rows;
  },

  async buscar(q, tipos = []) {
    const params = [buildSearchTerm(q)];
    let where = `WHERE unaccent(lower(p.nome)) LIKE unaccent(lower($1))`;

    if (tipos.length) {
      params.push(tipos);
      where += ` AND p.tipo = ANY($2)`;
    }

    const { rows } = await pool.query(
      `
    SELECT
      p.id,
      p.nome,
      p.tipo,
      p.sku,
      p.estoque_minimo,
      p.preco_venda,
      p.custo,
      p.unidade_medida
    FROM produtos p
    ${where}
    ORDER BY p.nome
    LIMIT 20
    `,
      params,
    );

    return rows;
  },
};
