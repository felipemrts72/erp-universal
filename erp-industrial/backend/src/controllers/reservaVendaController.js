import { reservaVendaService } from '../services/reservaVendaService.js';

export const reservaVendaController = {
  async listarPendentesCompra(req, res) {
    const result = await reservaVendaService.listarPendentesCompra();
    res.json(result);
  },

  async vincularEntrada(req, res) {
    const result = await reservaVendaService.vincularEntradaNaVenda(req.body);
    res.status(201).json(result);
  },
};
