import { relatorioRepository } from '../repositories/relatorioRepository.js';
import { funcionarioRepository } from '../repositories/funcionarioRepository.js';
import { producaoRepository } from '../repositories/producaoRepository.js';
import { httpError } from '../utils/httpError.js';

function diasEntre(inicio, fim) {
  if (!inicio || !fim) return null;
  const diff = new Date(fim).getTime() - new Date(inicio).getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export const relatorioService = {
  async create(payload, files) {
    const { ordem_producao_id, funcionario_id, descricao } = payload;

    if (!ordem_producao_id) {
      throw httpError('ordem_producao_id é obrigatório', 400);
    }

    if (!funcionario_id) {
      throw httpError('funcionario_id é obrigatório', 400);
    }

    if (!descricao || !String(descricao).trim()) {
      throw httpError('Descrição é obrigatória', 400);
    }

    const funcionario = await funcionarioRepository.getById(
      Number(funcionario_id),
    );

    if (!funcionario) {
      throw httpError('Funcionário não encontrado', 404);
    }

    const ordem = await producaoRepository.getById(Number(ordem_producao_id));

    if (!ordem) {
      throw httpError('Ordem de produção não encontrada', 404);
    }

    const fotos = Array.isArray(files?.fotos)
      ? files.fotos.map(
          (file) => `/uploads/relatorios-producao/${file.filename}`,
        )
      : [];

    if (fotos.length > 5) {
      throw httpError('Máximo de 5 fotos por relatório', 400);
    }

    return relatorioRepository.create({
      ordem_producao_id: Number(ordem_producao_id),
      funcionario_id: Number(funcionario_id),
      nome_funcionario: funcionario.nome,
      descricao: String(descricao).trim(),
      fotos,
    });
  },

  async list(ordemId) {
    if (!ordemId) {
      throw httpError('ordemId é obrigatório', 400);
    }

    return relatorioRepository.listByOrdem(Number(ordemId));
  },

  async auditoriaResumo() {
    const ordens = await relatorioRepository.listAuditoriaResumo();

    const enriched = await Promise.all(
      ordens.map(async (ordem) => {
        const ultimoFuncionario =
          await relatorioRepository.getUltimoFuncionarioPorOrdem(ordem.id);

        const diasEmAberto = diasEntre(ordem.criado_em, new Date());
        const diasParaEntrega = ordem.prazo_entrega
          ? diasEntre(new Date(), ordem.prazo_entrega)
          : null;

        return {
          ...ordem,
          total_relatorios: Number(ordem.total_relatorios || 0),
          ultimo_funcionario: ultimoFuncionario,
          dias_em_aberto: diasEmAberto,
          dias_para_entrega: diasParaEntrega,
        };
      }),
    );

    return enriched;
  },

  async auditoriaDetalhe(ordemId) {
    return relatorioRepository.listByOrdem(Number(ordemId));
  },

  async indicadores() {
    return relatorioRepository.indicadores();
  },
};
