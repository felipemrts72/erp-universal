import { estoqueService } from '../services/estoqueService.js';

export const estoqueController = {
  async list(req, res) {
    const result = await estoqueService.listarEstoqueAtual();
    res.json(result);
  },

  async entrada(req, res) {
    const result = await estoqueService.entradaEstoque(req.body);
    res.status(201).json(result);
  },

  async movimentos(req, res) {
    const result = await estoqueService.listarMovimentos();
    res.json(result);
  },

  async buscar(req, res) {
    const result = await estoqueService.buscar(req.query.q);
    res.json(result);
  },

  async buscarMovimentos(req, res) {
    const result = await estoqueService.buscarMovimentos(req.query.q);
    res.json(result);
  },

  async ajuste(req, res) {
    const result = await estoqueService.ajuste(req.body);
    res.status(201).json(result);
  },
  async movimentos(req, res) {
    const result = await estoqueService.listarMovimentosFiltrados({
      startDate: req.query.startDate,
      startTime: req.query.startTime,
      endDate: req.query.endDate,
      endTime: req.query.endTime,
      page: req.query.page,
      limit: req.query.limit,
    });

    res.json(result);
  },
};
