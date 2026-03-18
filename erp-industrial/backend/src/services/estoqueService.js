import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { estoqueRepository } from '../repositories/estoqueRepository.js';
import { producaoRepository } from '../repositories/producaoRepository.js';
import { produtoRepository } from '../repositories/produtoRepository.js';
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

  async retiradaProducao({ ordem_producao_id, usuario_id }) {
    const ordem = await producaoRepository.getById(ordem_producao_id);
    if (!ordem) throw httpError('Ordem de produção não encontrada', 404);

    const componentes = await produtoRepository.buscarComponentes(ordem.produto_id);
    if (!componentes.length) throw httpError('Produto da ordem não possui componentes cadastrados');

    const movimentos = [];
    for (const componente of componentes) {
      const necessario = Number(componente.quantidade) * Number(ordem.quantidade);
      const saldo = await estoqueRepository.getEstoqueAtual(componente.componente_id);
      if (saldo < necessario) {
        throw httpError(`Estoque insuficiente para componente ${componente.componente_nome}`);
      }
      const movimento = await estoqueRepository.criarMovimentoEstoque({
        produtoId: componente.componente_id,
        quantidade: -necessario,
        tipoMovimento: 'saida',
        referenciaTipo: 'ordem_producao_retirada',
        referenciaId: ordem_producao_id
      });

      await estoqueRepository.registrarAuditoria({
        tipo: 'retirada_producao',
        usuario_id,
        ordem_producao_id,
        produto_id: componente.componente_id,
        quantidade: necessario,
        observacao: 'Retirada padrão por lista de componentes'
      });
      movimentos.push(movimento);
    }

    return { ordem_producao_id, movimentos };
  },

  async registrarInsumoExtra(payload) {
    const obrigatorios = ['produto_id', 'quantidade', 'observacao', 'solicitado_por', 'assinatura_url', 'usuario_id', 'ordem_producao_id'];
    for (const campo of obrigatorios) {
      if (!payload[campo]) throw httpError(`Campo obrigatório ausente: ${campo}`);
    }

    const ordem = await producaoRepository.getById(payload.ordem_producao_id);
    if (!ordem) throw httpError('Ordem de produção não encontrada', 404);

    const saldo = await estoqueRepository.getEstoqueAtual(payload.produto_id);
    if (saldo < Number(payload.quantidade)) throw httpError('Estoque insuficiente para insumo extra');

    const assinaturaUrl = payload.assinatura_url.startsWith('data:')
      ? salvarAssinaturaBase64(payload.assinatura_url)
      : payload.assinatura_url;

    const movimento = await estoqueRepository.criarMovimentoEstoque({
      produtoId: payload.produto_id,
      quantidade: -Number(payload.quantidade),
      tipoMovimento: 'saida',
      referenciaTipo: 'ordem_producao_insumo_extra',
      referenciaId: payload.ordem_producao_id
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
      assinatura_url: assinaturaUrl
    });

    return { movimento, auditoria };
  }
};
