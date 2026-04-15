import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { entregaRepository } from '../repositories/entregaRepository.js';
import { vendaRepository } from '../repositories/vendaRepository.js';
import { vendaService } from './vendaService.js';
import { httpError } from '../utils/httpError.js';
import { pool } from '../database/pool.js';
import { estoqueRepository } from '../repositories/estoqueRepository.js';
import { reservaVendaRepository } from '../repositories/reservaVendaRepository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function salvarBase64Arquivo(base64, prefixo) {
  if (!base64) return null;
  if (!String(base64).startsWith('data:')) return base64;

  const match = base64.match(/^data:(.+);base64,(.+)$/);
  if (!match) throw httpError('Arquivo em base64 inválido', 400);

  const mimeType = match[1];
  const ext = mimeType.includes('png')
    ? 'png'
    : mimeType.includes('jpeg') || mimeType.includes('jpg')
      ? 'jpg'
      : 'bin';

  const nome = `${prefixo}-${Date.now()}.${ext}`;
  const pasta = path.join(__dirname, '../../uploads/entregas');

  if (!fs.existsSync(pasta)) {
    fs.mkdirSync(pasta, { recursive: true });
  }

  const destino = path.join(pasta, nome);
  fs.writeFileSync(destino, Buffer.from(match[2], 'base64'));

  return `/uploads/entregas/${nome}`;
}

function traduzirStatusEntrega(status) {
  const map = {
    processo_de_compra: 'A venda ainda possui itens aguardando compra.',
    em_fabricacao: 'A venda ainda possui itens em fabricação.',
    producao_e_compra:
      'A venda ainda possui itens em fabricação e compra pendente.',
    aguardando_retirada: 'Aguardando retirada',
  };

  return map[status] || 'A venda ainda não está pronta para saída.';
}

export const entregaService = {
  async listarPendentes() {
    return entregaRepository.listarPendentes();
  },

  async listarSaidasHoje() {
    return entregaRepository.listarSaidasHoje();
  },

  async listarTodas() {
    return entregaRepository.listarTodas();
  },

  async entregar(vendaId, payload) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const entrega = await entregaRepository.getResumoByVendaId(vendaId);

      if (!entrega) {
        throw httpError('Entrega não encontrada', 404);
      }

      if (entrega.status !== 'pendente') {
        throw httpError('Entrega não está pendente', 400);
      }

      if (!payload?.nome_recebedor || !String(payload.nome_recebedor).trim()) {
        throw httpError('Nome de quem retirou é obrigatório', 400);
      }

      if (!payload?.assinatura_saida_url) {
        throw httpError('Assinatura é obrigatória', 400);
      }

      if (entrega.venda_id) {
        const vendasAbertas = await vendaService.listarAbertas();
        const vendaAtual = vendasAbertas.find(
          (v) => Number(v.id) === Number(entrega.venda_id),
        );

        const statusCalculado = vendaAtual?.status_venda || null;

        if (statusCalculado !== 'aguardando_retirada') {
          throw httpError(traduzirStatusEntrega(statusCalculado), 400);
        }
      }

      const foto_saida_url = payload?.foto_saida_url
        ? salvarBase64Arquivo(payload.foto_saida_url, 'foto-saida')
        : null;

      const assinatura_saida_url = salvarBase64Arquivo(
        payload.assinatura_saida_url,
        'assinatura-saida',
      );

      const pendentesRows =
        await entregaRepository.listarPendentesRowsByVendaId(vendaId, client);

      for (const item of pendentesRows) {
        await estoqueRepository.criarMovimento(
          {
            produtoId: item.produto_id,
            quantidade: -Number(item.quantidade),
            tipoMovimento: 'saida',
            referenciaTipo: 'entrega_venda',
            referenciaId: vendaId,
          },
          client,
        );
      }

      const entregasAtualizadas = await entregaRepository.entregarVenda(
        vendaId,
        {
          usuario_id: payload?.usuario_id || null,
          tipo: payload?.tipo || entrega.tipo || 'retirada',
          nome_recebedor: payload?.nome_recebedor || null,
          documento_recebedor: payload?.documento_recebedor || null,
          placa_veiculo: payload?.placa_veiculo || null,
          observacoes_saida: payload?.observacoes_saida || null,
          codigo_rastreio: payload?.codigo_rastreio || null,
          foto_saida_url,
          assinatura_saida_url,
        },
        client,
      );

      if (!entregasAtualizadas?.length) {
        throw httpError('Entrega não encontrada ou já concluída', 404);
      }

      await reservaVendaRepository.marcarAtendidoPorVenda(vendaId, client);

      const pendentes = await entregaRepository.countPendentesByVendaId(
        vendaId,
        client,
      );

      if (Number(pendentes) === 0) {
        await vendaRepository.updateStatus(vendaId, 'finalizado');
      }

      await client.query('COMMIT');

      return { message: 'Saída registrada com sucesso' };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};
