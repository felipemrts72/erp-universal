import { clienteService } from '../services/clienteService.js';

export const clienteController = {
  async create(req, res) {
    const result = await clienteService.create(req.body);
    res.status(201).json(result);
  },

  async list(req, res) {
    const result = await clienteService.list();
    res.json(result);
  },

  async update(req, res) {
    const result = await clienteService.update(Number(req.params.id), req.body);
    res.json(result);
  },

  async delete(req, res) {
    const result = await clienteService.delete(Number(req.params.id));
    res.json(result);
  },

  async buscar(req, res) {
    const result = await clienteService.buscar(req.query.q);
    res.json(result);
  },
  async getById(req, res) {
    const result = await clienteService.getById(Number(req.params.id));
    res.json(result);
  },
};
