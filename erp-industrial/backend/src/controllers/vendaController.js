import { vendaService } from '../services/vendaService.js';

export const vendaController = {
  // 🔹 Listar vendas abertas (com status calculado)
  async list(req, res) {
    const result = await vendaService.listarAbertas();
    res.json(result);
  },

  // 🔹 Criar venda direta (sem orçamento)
  async create(req, res) {
    const result = await vendaService.createDireta(req.body);
    res.status(201).json(result);
  },

  // 🔹 Criar venda a partir de orçamento (se quiser manter)
  async createFromOrcamento(req, res) {
    const result = await vendaService.createFromOrcamento(req.body.orcamentoId);
    res.status(201).json(result);
  },
};
