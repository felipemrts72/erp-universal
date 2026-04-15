import fs from 'fs';
import path from 'path';
import { pool } from '../database/pool.js';
import { fileURLToPath } from 'url';
import { estoqueRepository } from '../repositories/estoqueRepository.js';
import { producaoRepository } from '../repositories/producaoRepository.js';
import { produtoRepository } from '../repositories/produtoRepository.js';
import { reservaVendaService } from './reservaVendaService.js';
import { httpError } from '../utils/httpError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function salvarAssinaturaBase64(base64) {
  const match = base64.match(/^data:(.+);base64,(.+)$/);
  if (!match) throw httpError('assinatura_url precisa estar em base64 válido');
  const ext = match[1].includes('png') ? 'png' : 'jpg';
  const nome = `assinatura-${Date.now()}.${ext}`;
  const destino = path.join(__dirname, '../../uploads/signatures', nome);
  fs.writeFileSync(destino, Buffer.from(match[2], 'base64'));
  return `/uploads/signatures/${nome}`;
}

export const estoqueService = {
  async listarEstoqueAtual() {
    return estoqueRepository.listarResumoEstoque();
  },
  async listarMovimentos() {
    return estoqueRepository.listarMovimentos();
  },

  async buscarMovimentos(q) {
    if (!q) return [];
    return estoqueRepository.buscarMovimentos(q);
  },
  async listarMovimentosFiltrados({
    startDate,
    startTime,
    endDate,
    endTime,
    page = 1,
    limit = 10,
  }) {
    const now = new Date();

    const start = startDate
      ? new Date(`${startDate}T${startTime || '00:00'}:00`)
      : new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const end = endDate ? new Date(`${endDate}T${endTime || '23:59'}:59`) : now;

    const diffMs = end.getTime() - start.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays < 0) {
      throw httpError('Período inválido');
    }

    if (diffDays > 90) {
      throw httpError('O período máximo permitido é de 90 dias');
    }

    return estoqueRepository.listarMovimentosFiltrados({
      start,
      end,
      page: Number(page) || 1,
      limit: Number(limit) || 10,
    });
  },

  async retiradaProducao({ ordem_producao_id, usuario_id }) {
    const ordem = await producaoRepository.getById(ordem_producao_id);
    if (!ordem) throw httpError('Ordem de produção não encontrada', 404);

    const componentes = await produtoRepository.buscarComponentes(
      ordem.produto_id,
    );
    if (!componentes.length)
      throw httpError('Produto da ordem não possui componentes cadastrados');

    const movimentos = [];
    for (const componente of componentes) {
      const necessario =
        Number(componente.quantidade) * Number(ordem.quantidade);
      const saldo = await estoqueRepository.getEstoqueAtual(
        componente.componente_id,
      );
      if (saldo < necessario) {
        throw httpError(
          `Estoque insuficiente para componente ${componente.componente_nome}`,
        );
      }
      const movimento = await estoqueRepository.criarMovimento({
        produtoId: componente.componente_id,
        quantidade: -necessario,
        tipoMovimento: 'saida',
        referenciaTipo: 'ordem_producao_retirada',
        referenciaId: ordem_producao_id,
      });

      await estoqueRepository.registrarAuditoria({
        tipo: 'retirada_producao',
        usuario_id,
        ordem_producao_id,
        produto_id: componente.componente_id,
        quantidade: necessario,
        observacao: 'Retirada padrão por lista de componentes',
      });
      movimentos.push(movimento);
    }

    return { ordem_producao_id, movimentos };
  },

  async registrarInsumoExtra(payload) {
    const obrigatorios = [
      'produto_id',
      'quantidade',
      'observacao',
      'solicitado_por',
      'assinatura_url',
      'usuario_id',
      'ordem_producao_id',
    ];
    for (const campo of obrigatorios) {
      if (!payload[campo])
        throw httpError(`Campo obrigatório ausente: ${campo}`);
    }

    const ordem = await producaoRepository.getById(payload.ordem_producao_id);
    if (!ordem) throw httpError('Ordem de produção não encontrada', 404);

    const saldo = await estoqueRepository.getEstoqueAtual(payload.produto_id);
    if (saldo < Number(payload.quantidade))
      throw httpError('Estoque insuficiente para insumo extra');

    const assinaturaUrl = payload.assinatura_url.startsWith('data:')
      ? salvarAssinaturaBase64(payload.assinatura_url)
      : payload.assinatura_url;

    const movimento = await estoqueRepository.criarMovimento({
      produtoId: payload.produto_id,
      quantidade: -Number(payload.quantidade),
      tipoMovimento: 'saida',
      referenciaTipo: 'ordem_producao_insumo_extra',
      referenciaId: payload.ordem_producao_id,
    });

    const auditoria = await estoqueRepository.registrarAuditoria({
      tipo: 'insumo_extra',
      ordem_producao_id: payload.ordem_producao_id,
      usuario_id: payload.usuario_id,
      produto_id: payload.produto_id,
      quantidade: payload.quantidade,
      observacao: payload.observacao,
      valor_unitario: payload.valor_unitario || null,
      solicitado_por: payload.solicitado_por,
      assinatura_url: assinaturaUrl,
    });

    return { movimento, auditoria };
  },

  async entradaEstoque({
    produtoId,
    quantidade,
    custoUnitario,
    fornecedor,
    usuarioId,
  }) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 🔥 validações
      if (!produtoId) throw httpError('Produto obrigatório');
      if (!usuarioId) throw httpError('Usuário obrigatório');
      if (quantidade <= 0)
        throw httpError('Quantidade deve ser maior que zero');
      if (custoUnitario <= 0) throw httpError('Custo deve ser maior que zero');

      // 1. saldo atual
      const saldoAtual = await estoqueRepository.getEstoqueAtual(
        produtoId,
        client,
      );

      // 2. buscar produto
      const { rows } = await client.query(
        'SELECT custo, tipo FROM produtos WHERE id = $1',
        [produtoId],
      );

      if (!rows.length) {
        throw httpError('Produto não encontrado', 404);
      }
      const tipoProduto = rows[0].tipo;

      if (tipoProduto === 'fabricado' || tipoProduto === 'conjunto') {
        const existeOrdemAberta =
          await producaoRepository.existeOrdemAbertaPorProduto(
            produtoId,
            client,
          );

        if (existeOrdemAberta) {
          throw httpError(
            'Não é permitido lançar entrada manual para este produto enquanto houver ordem de produção em aberto. Finalize a produção para dar entrada no estoque.',
            400,
          );
        }
      }

      const custoAtual = Number(rows[0].custo || 0);

      // 3. cálculo custo médio
      const novoCusto =
        saldoAtual === 0
          ? custoUnitario
          : (custoAtual * saldoAtual + custoUnitario * quantidade) /
            (saldoAtual + quantidade);

      // 4. atualizar produto
      await client.query(
        `UPDATE produtos 
       SET custo = $1,
           ultimo_preco_compra = $2
       WHERE id = $3`,
        [novoCusto, custoUnitario, produtoId],
      );

      // 5. movimento (AGORA DENTRO DA TRANSAÇÃO)
      await estoqueRepository.criarMovimento(
        {
          produtoId,
          quantidade,
          tipoMovimento: 'entrada',
          referenciaTipo: 'compra',
          referenciaId: null,
        },
        client,
      );

      // 6. auditoria
      await estoqueRepository.registrarAuditoria(
        {
          tipo: 'entrada_estoque',
          produto_id: produtoId,
          quantidade,
          custo_unitario: custoUnitario,
          fornecedor,
          usuario_id: usuarioId,
        },
        client,
      );

      // 7. reservar automaticamente para vendas pendentes
      await reservaVendaService.reservarEntradasPendentes(produtoId, client);

      await client.query('COMMIT');

      return { novoCusto };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};
