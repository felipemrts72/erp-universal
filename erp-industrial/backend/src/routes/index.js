import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { produtoController } from '../controllers/produtoController.js';
import { estoqueController } from '../controllers/estoqueController.js';
import { orcamentoController } from '../controllers/orcamentoController.js';
import { pedidoController } from '../controllers/pedidoController.js';
import { producaoController } from '../controllers/producaoController.js';
import { relatorioController } from '../controllers/relatorioController.js';
import { dashboardController } from '../controllers/dashboardController.js';
import { upload } from '../middleware/upload.js';

export const router = Router();

router.get('/health', (req, res) => res.json({ ok: true }));

router.get('/produtos', asyncHandler(produtoController.list));
router.post('/produtos', asyncHandler(produtoController.create));
router.post('/produtos/:id/componentes', asyncHandler(produtoController.addComponente));

router.get('/estoque', asyncHandler(estoqueController.list));
router.post('/estoque', asyncHandler(estoqueController.registrar));

router.get('/orcamentos', asyncHandler(orcamentoController.list));
router.post('/orcamentos', asyncHandler(orcamentoController.create));
router.patch('/orcamentos/:id/status', asyncHandler(orcamentoController.updateStatus));

router.get('/pedidos', asyncHandler(pedidoController.list));
router.post('/pedidos', asyncHandler(pedidoController.create));

router.get('/producao', asyncHandler(producaoController.list));
router.post('/producao', asyncHandler(producaoController.create));
router.post('/producao/:id/iniciar', asyncHandler(producaoController.iniciar));
router.post('/producao/:id/finalizar', asyncHandler(producaoController.finalizar));

router.get('/relatorios-producao', asyncHandler(relatorioController.list));
router.post(
  '/relatorios-producao',
  upload.fields([
    { name: 'foto', maxCount: 1 },
    { name: 'assinatura', maxCount: 1 }
  ]),
  asyncHandler(relatorioController.create)
);

router.get('/dashboard', asyncHandler(dashboardController.resumo));
router.get('/alertas', asyncHandler(dashboardController.alertas));
