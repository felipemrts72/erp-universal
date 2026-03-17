import { pedidoService } from '../services/pedidoService.js';

export const pedidoController = {
  async create(req, res) {
    const result = await pedidoService.createFromOrcamento(req.body.orcamentoId);
    res.status(201).json(result);
  },
  async list(req, res) {
    const result = await pedidoService.list();
    res.json(result);
  }
};
