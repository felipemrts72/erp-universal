import { consumivelService } from '../services/consumivelService.js';

export const consumivelController = {
  async registrar(req, res) {
    const result = await consumivelService.registrarSaida(req.body);
    res.status(201).json(result);
  },

  async listar(req, res) {
    const result = await consumivelService.listar();
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
