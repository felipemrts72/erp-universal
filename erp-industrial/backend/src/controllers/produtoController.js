import { produtoService } from '../services/produtoService.js';

export const produtoController = {
  async create(req, res) {
    const result = await produtoService.create(req.body, req.user);
    res.status(201).json(result);
    console.log(req.user);
  },
  async list(req, res) {
    const result = await produtoService.list();
    res.json(result);
  },
  async addComponente(req, res) {
    const result = await produtoService.addComponente({
      ...req.body,
      produtoId: Number(req.params.id),
    });
    res.status(201).json(result);
  },
  async buscar(req, res) {
    const { q, tipos } = req.query;

    const tiposArray = tipos
      ? String(tipos)
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

    const result = await produtoService.buscar(q, tiposArray);
    res.json(result);
  },
};
