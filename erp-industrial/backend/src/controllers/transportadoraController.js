import { transportadoraService } from '../services/transportadoraService.js';

export const transportadoraController = {
  async list(req, res) {
    const somenteAtivas =
      String(req.query.somenteAtivas || '').toLowerCase() === 'true';

    const result = await transportadoraService.list({ somenteAtivas });
    res.json(result);
  },

  async getById(req, res) {
    const result = await transportadoraService.getById(Number(req.params.id));
    res.json(result);
  },

  async create(req, res) {
    const result = await transportadoraService.create(req.body);
    res.status(201).json(result);
  },

  async update(req, res) {
    const result = await transportadoraService.update(
      Number(req.params.id),
      req.body,
    );
    res.json(result);
  },

  async delete(req, res) {
    const result = await transportadoraService.delete(Number(req.params.id));
    res.json(result);
  },

  async buscar(req, res) {
    const result = await transportadoraService.buscar(req.query.q);
    res.json(result);
  },
};
