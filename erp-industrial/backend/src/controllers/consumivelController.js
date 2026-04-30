import { consumivelService } from '../services/consumivelService.js';

export const consumivelController = {
  async registrar(req, res) {
    console.log('REQ.USER CONSUMÍVEIS:', req.user);
    const usuarioId = req.user?.id || req.user?.userId || req.user?.usuario_id;

    if (!usuarioId) {
      return res.status(401).json({
        message: 'Usuário logado não identificado no token',
        user: req.user,
      });
    }

    const result = await consumivelService.registrarSaida({
      ...req.body,
      usuario_id: usuarioId,
    });

    res.status(201).json(result);
  },

  async listar(req, res) {
    const result = await consumivelService.listar(req.query);
    res.json(result);
  },

  async alertas(req, res) {
    const result = await consumivelService.alertas();
    res.json(result);
  },

  async relatorioMensal(req, res) {
    const result = await consumivelService.relatorioMensal();
    res.json(result);
  },

  async justificar(req, res) {
    const { id } = req.params;
    const { justificativa } = req.body;

    const result = await consumivelService.justificar(id, justificativa);
    res.json(result);
  },
};
