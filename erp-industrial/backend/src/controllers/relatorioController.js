import { relatorioService } from '../services/relatorioService.js';

export const relatorioController = {
  async create(req, res) {
    const result = await relatorioService.create(req.body, req.files);
    res.status(201).json(result);
  },

  async list(req, res) {
    const result = await relatorioService.list(req.query.ordemId);
    res.json(result);
  },

  async auditoriaResumo(req, res) {
    const result = await relatorioService.auditoriaResumo();
    res.json(result);
  },

  async auditoriaDetalhe(req, res) {
    const result = await relatorioService.auditoriaDetalhe(
      Number(req.params.ordemId),
    );
    res.json(result);
  },

  async indicadores(req, res) {
    const result = await relatorioService.indicadores();
    res.json(result);
  },
};
