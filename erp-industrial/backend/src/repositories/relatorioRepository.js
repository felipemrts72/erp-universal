import { pool } from '../database/pool.js';

export const relatorioRepository = {
  async create({
    ordem_producao_id,
    funcionario_id,
    nome_funcionario,
    descricao,
    assinatura_url = null,
    fotos = [],
  }) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const { rows } = await client.query(
        `
        INSERT INTO relatorios_producao
          (ordem_producao_id, funcionario_id, nome_funcionario, descricao, assinatura_url)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        `,
        [
          ordem_producao_id,
          funcionario_id || null,
          nome_funcionario,
          descricao,
          assinatura_url,
        ],
      );

      const relatorio = rows[0];

      for (const fotoUrl of fotos) {
        await client.query(
          `
          INSERT INTO relatorio_producao_fotos
            (relatorio_producao_id, foto_url)
          VALUES ($1, $2)
          `,
          [relatorio.id, fotoUrl],
        );
      }

      await client.query('COMMIT');
      return relatorio;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async listByOrdem(ordemId) {
    const { rows } = await pool.query(
      `
      SELECT
        rp.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', rf.id,
              'foto_url', rf.foto_url
            )
          ) FILTER (WHERE rf.id IS NOT NULL),
          '[]'
        ) AS fotos
      FROM relatorios_producao rp
      LEFT JOIN relatorio_producao_fotos rf
        ON rf.relatorio_producao_id = rp.id
      WHERE rp.ordem_producao_id = $1
      GROUP BY rp.id
      ORDER BY rp.criado_em DESC
      `,
      [ordemId],
    );

    return rows;
  },

  async listAuditoriaResumo() {
    const { rows } = await pool.query(
      `
      SELECT
        op.id,
        op.status,
        op.quantidade,
        op.criado_em,
        op.venda_id,
        p.nome AS produto_nome,
        v.cliente_nome,
        v.prazo_entrega,
        COUNT(rp.id) AS total_relatorios,
        MAX(rp.criado_em) AS ultimo_relatorio_em
      FROM ordens_producao op
      INNER JOIN produtos p ON p.id = op.produto_id
      LEFT JOIN vendas v ON v.id = op.venda_id
      LEFT JOIN relatorios_producao rp ON rp.ordem_producao_id = op.id
      GROUP BY op.id, p.nome, v.cliente_nome, v.prazo_entrega
      ORDER BY op.id DESC
      `,
    );

    return rows;
  },

  async getUltimoFuncionarioPorOrdem(ordemId) {
    const { rows } = await pool.query(
      `
      SELECT nome_funcionario
      FROM relatorios_producao
      WHERE ordem_producao_id = $1
      ORDER BY criado_em DESC
      LIMIT 1
      `,
      [ordemId],
    );

    return rows[0]?.nome_funcionario || null;
  },

  async indicadores() {
    const { rows: itensMaisProduzidos } = await pool.query(`
    SELECT
      p.nome AS produto_nome,
      SUM(op.quantidade) AS total_produzido
    FROM ordens_producao op
    INNER JOIN produtos p ON p.id = op.produto_id
    WHERE op.status = 'finalizado'
    GROUP BY p.nome
    ORDER BY total_produzido DESC
    LIMIT 10
  `);

    const { rows: funcionariosMaisAtivos } = await pool.query(`
    SELECT
      rp.nome_funcionario,
      f.setor,
      COUNT(*) AS total_relatorios
    FROM relatorios_producao rp
    LEFT JOIN funcionarios f ON f.id = rp.funcionario_id
    GROUP BY rp.nome_funcionario, f.setor
    ORDER BY total_relatorios DESC
    LIMIT 10
  `);

    const { rows: producaoPorSetor } = await pool.query(`
    SELECT
      COALESCE(f.setor, 'Sem setor') AS setor,
      COUNT(*) AS total_relatorios
    FROM relatorios_producao rp
    LEFT JOIN funcionarios f ON f.id = rp.funcionario_id
    GROUP BY COALESCE(f.setor, 'Sem setor')
    ORDER BY total_relatorios DESC
  `);

    return {
      itensMaisProduzidos,
      funcionariosMaisAtivos,
      producaoPorSetor,
    };
  },
};
