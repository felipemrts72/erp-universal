import { orcamentoService } from '../services/orcamentoService.js';

export const orcamentoController = {
  async create(req, res) {
    const result = await orcamentoService.create(req.body);
    res.status(201).json(result);
  },
  async list(req, res) {
    const result = await orcamentoService.list();
    res.json(result);
  },
  async updateStatus(req, res) {
    const result = await orcamentoService.updateStatus(Number(req.params.id), req.body.status);
    res.json(result);
  }
};
