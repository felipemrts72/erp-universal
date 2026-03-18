import { dashboardService } from '../services/dashboardService.js';
import { alertaService } from '../services/alertaService.js';

export const dashboardController = {
  async resumo(req, res) {
    const result = await dashboardService.getResumo();
    res.json(result);
  },
  async alertas(req, res) {
    const result = await alertaService.listarAlertas();
    res.json(result);
  }
};
