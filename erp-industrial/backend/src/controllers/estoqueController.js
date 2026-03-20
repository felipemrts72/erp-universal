import { estoqueService } from '../services/estoqueService.js';

export const estoqueController = {
  async list(req, res) {
    const result = await estoqueService.listarEstoqueAtual();
    res.json(result);
  },

  async retiradaProducao(req, res) {
    const result = await estoqueService.retiradaProducao(req.body);
    res.status(201).json(result);
  },

  async insumoExtra(req, res) {
    const result = await estoqueService.registrarInsumoExtra(req.body);
    res.status(201).json(result);
  },
  async entrada(req, res) {
    const result = await estoqueService.entradaEstoque(req.body);
    res.status(201).json(result);
  },
};
