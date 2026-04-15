import { entregaService } from '../services/entregaService.js';

export const entregaController = {
  async pendentes(req, res) {
    const result = await entregaService.listarPendentes();
    res.json(result);
  },

  async saidasHoje(req, res) {
    const result = await entregaService.listarSaidasHoje();
    res.json(result);
  },

  async listar(req, res) {
    const result = await entregaService.listarTodas();
    res.json(result);
  },

  async entregar(req, res) {
    const { id } = req.params;
    const usuario_id = req.user?.id || null;

    const result = await entregaService.entregar(Number(id), {
      ...req.body,
      usuario_id,
    });

    res.json(result);
  },
};
