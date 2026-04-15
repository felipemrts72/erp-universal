import { producaoService } from '../services/producaoService.js';

export const producaoController = {
  async list(req, res) {
    const result = await producaoService.list();
    res.json(result);
  },

  async create(req, res) {
    const result = await producaoService.createOrdem(req.body);
    res.status(201).json(result);
  },

  async iniciar(req, res) {
    const { ordemId } = req.body;
    const result = await producaoService.iniciar(Number(ordemId));
    res.json(result);
  },

  async finalizar(req, res) {
    const { ordemId } = req.body;
    const usuario_id = req.user?.id || null;

    const result = await producaoService.finalizar(Number(ordemId), usuario_id);

    res.json(result);
  },
};
