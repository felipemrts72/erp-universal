import { estoqueService } from '../services/estoqueService.js';

export const estoqueController = {
  async registrar(req, res) {
    const result = await estoqueService.registrarMovimento(req.body);
    res.status(201).json(result);
  },
  async list(req, res) {
    const result = await estoqueService.listarMovimentos();
    res.json(result);
  }
};
