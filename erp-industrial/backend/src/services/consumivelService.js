import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../database/pool.js';
import { estoqueRepository } from '../repositories/estoqueRepository.js';
import { httpError } from '../utils/httpError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function salvarBase64(base64, pasta) {
  const match = base64.match(/^data:(.+);base64,(.+)$/);
  if (!match) throw httpError('Imagem inválida');

  const ext = match[1].includes('png') ? 'png' : 'jpg';
  const nome = `${pasta}-${Date.now()}.${ext}`;
  const dir = path.join(__dirname, `../../uploads/${pasta}`);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const destino = path.join(dir, nome);

  fs.writeFileSync(destino, Buffer.from(match[2], 'base64'));

  return `/uploads/${pasta}/${nome}`;
}

export const consumivelService = {
  async registrarSaida(payload) {
    const {
      produto_id,
      quantidade,
      funcionario_id, // 🔥 quem pegou
      usuario_id, // 🔥 quem registrou
      setor,
      assinatura,
      foto,
    } = payload;

    // 🔒 validações básicas
    if (
      !produto_id ||
      !quantidade ||
      !funcionario_id ||
      !usuario_id ||
      !setor
    ) {
      throw httpError('Campos obrigatórios faltando');
    }

    if (quantidade <= 0) {
      throw httpError('Quantidade deve ser maior que zero');
    }

    if (setor.length < 2) {
      throw httpError('Setor inválido');
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 🔥 validar produto
      const { rows: produtoRows } = await client.query(
        `SELECT tipo FROM produtos WHERE id = $1`,
        [produto_id],
      );

      if (!produtoRows.length) {
        throw httpError('Produto não encontrado');
      }

      if (produtoRows[0].tipo !== 'consumivel') {
        throw httpError('Produto não é consumível');
      }

      // 🔥 validar funcionário
      const { rows: funcRows } = await client.query(
        `SELECT id FROM funcionarios WHERE id = $1`,
        [funcionario_id],
      );

      if (!funcRows.length) {
        throw httpError('Funcionário não encontrado');
      }

      // 🔥 validar estoque
      const saldo = await estoqueRepository.getEstoqueAtual(produto_id, client);

      if (saldo < quantidade) {
        throw httpError('Estoque insuficiente');
      }

      // 🔥 salvar imagens
      const assinaturaUrl = assinatura
        ? salvarBase64(assinatura, 'signatures')
        : null;

      const fotoUrl = foto ? salvarBase64(foto, 'photos') : null;

      // 🔥 baixa estoque
      await estoqueRepository.criarMovimento(
        {
          produtoId: produto_id,
          quantidade: -quantidade,
          tipoMovimento: 'saida',
          referenciaTipo: 'consumo_consumivel',
          referenciaId: null,
        },
        client,
      );

      // 🔥 registra consumo (AGORA CORRETO)
      const { rows: consumoRows } = await client.query(
        `INSERT INTO consumos_consumiveis
        (produto_id, funcionario_id, usuario_id, setor, quantidade, assinatura_url, foto_url)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING *`,
        [
          produto_id,
          funcionario_id,
          usuario_id,
          setor,
          quantidade,
          assinaturaUrl,
          fotoUrl,
        ],
      );

      await client.query('COMMIT');

      return consumoRows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async listar() {
    const { rows } = await pool.query(`
      SELECT 
        c.*, 
        p.nome AS produto_nome,
        f.nome AS funcionario_nome
      FROM consumos_consumiveis c
      JOIN produtos p ON p.id = c.produto_id
      JOIN funcionarios f ON f.id = c.funcionario_id
      ORDER BY c.criado_em DESC
    `);

    return rows;
  },

  async alertas() {
    const { rows } = await pool.query(`
      WITH base AS (
        SELECT
          produto_id,
          funcionario_id,
          criado_em,
          EXTRACT(EPOCH FROM (
            criado_em - LAG(criado_em) OVER (
              PARTITION BY produto_id, funcionario_id
              ORDER BY criado_em
            )
          )) / 3600 AS intervalo_horas
        FROM consumos_consumiveis
      ),
      media AS (
        SELECT
          produto_id,
          funcionario_id,
          AVG(intervalo_horas) AS media_horas
        FROM base
        WHERE intervalo_horas IS NOT NULL
        GROUP BY produto_id, funcionario_id
      )
      SELECT b.*, m.media_horas
      FROM base b
      JOIN media m
        ON b.produto_id = m.produto_id
       AND b.funcionario_id = m.funcionario_id
      WHERE b.intervalo_horas IS NOT NULL
      AND b.intervalo_horas < m.media_horas * 0.5
    `);

    return rows;
  },

  async relatorioMensal() {
    const { rows } = await pool.query(`
      SELECT 
        funcionario_id,
        produto_id,
        SUM(quantidade) AS total,
        COUNT(*) AS retiradas
      FROM consumos_consumiveis
      WHERE criado_em >= date_trunc('month', CURRENT_DATE)
      GROUP BY funcionario_id, produto_id
      ORDER BY funcionario_id
    `);

    return rows;
  },

  async justificar(id, justificativa) {
    if (!justificativa || justificativa.length < 10) {
      throw httpError('Justificativa muito curta');
    }

    const { rows } = await pool.query(
      `UPDATE consumos_consumiveis
       SET justificativa = $1
       WHERE id = $2
       RETURNING *`,
      [justificativa, id],
    );

    return rows[0];
  },
};
