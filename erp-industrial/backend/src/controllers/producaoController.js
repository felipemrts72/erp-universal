import { producaoService } from '../services/producaoService.js';

export const producaoController = {
  async create(req, res) {
    const result = await producaoService.createOrdem(req.body);
    res.status(201).json(result);
  },
  async list(req, res) {
    const result = await producaoService.list();
    res.json(result);
  },
  async iniciar(req, res) {
    const result = await producaoService.iniciar(Number(req.body.ordem_producao_id));
    res.json(result);
  },
  async finalizar(req, res) {
    const result = await producaoService.finalizar(Number(req.body.ordem_producao_id));
    res.json(result);
  }
};
