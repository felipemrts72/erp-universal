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

  async getById(req, res) {
    const result = await orcamentoService.getById(Number(req.params.id));
    res.json(result);
  },

  async updateStatus(req, res) {
    const result = await orcamentoService.updateStatus(
      Number(req.params.id),
      req.body.status,
    );
    res.json(result);
  },

  async templates(req, res) {
    const result = await orcamentoService.templates();
    res.json(result);
  },

  async buscar(req, res) {
    const result = await orcamentoService.buscar(req.query.q);
    res.json(result);
  },

  async update(req, res) {
    const result = await orcamentoService.update(
      Number(req.params.id),
      req.body,
    );
    res.json(result);
  },

  async clonar(req, res) {
    const result = await orcamentoService.clonar(Number(req.params.id));
    res.status(201).json(result);
  },

  async aprovar(req, res) {
    const { id } = req.params;
    const result = await orcamentoService.aprovar(Number(id), req.body);
    res.json(result);
  },
};
