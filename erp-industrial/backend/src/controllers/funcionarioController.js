import { funcionarioService } from '../services/funcionarioService.js';

export const funcionarioController = {
  async create(req, res) {
    const result = await funcionarioService.create(req.body);
    res.status(201).json(result);
  },

  async list(req, res) {
    const result = await funcionarioService.list();
    res.json(result);
  },

  async update(req, res) {
    const result = await funcionarioService.update(
      Number(req.params.id),
      req.body,
    );
    res.json(result);
  },

  async delete(req, res) {
    const result = await funcionarioService.delete(Number(req.params.id));
    res.json(result);
  },
  async buscar(req, res) {
    const result = await funcionarioService.buscar(req.query.q);
    res.json(result);
  },
};
