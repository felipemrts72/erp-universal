import { consumivelService } from '../services/consumivelService.js';
import { estoqueService } from '../services/estoqueService.js';

export const auditoriaController = {
  async comprasReposicao(req, res) {
    const result = await estoqueService.listarComprasReposicao();
    res.json(result);
  },

  async consumiveis(req, res) {
    const result = await consumivelService.listar(req.query);
    res.json(result);
  },

  async indicadoresConsumiveis(req, res) {
    const result = await consumivelService.relatorioMensal();
    res.json(result);
  },

  async detalheConsumivel(req, res) {
    const result = await consumivelService.detalhe(req.params.id);
    res.json(result);
  },
};
