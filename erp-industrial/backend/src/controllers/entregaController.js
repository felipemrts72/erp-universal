import { entregaService } from '../services/entregaService.js';

export const entregaController = {
  async pendentes(req, res) {
    const result = await entregaService.listarPendentes();
    res.json(result);
  },

  async listar(req, res) {
    const result = await entregaService.listarTodas();
    res.json(result);
  },

  async entregar(req, res) {
    const { id } = req.params;
    const { usuario_id, tipo } = req.body;

    const result = await entregaService.entregar(Number(id), usuario_id, tipo);

    res.json(result);
  },
};
