import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { produtoController } from '../controllers/produtoController.js';
import { estoqueController } from '../controllers/estoqueController.js';
import { orcamentoController } from '../controllers/orcamentoController.js';
import { pedidoController } from '../controllers/pedidoController.js';
import { producaoController } from '../controllers/producaoController.js';
import { relatorioController } from '../controllers/relatorioController.js';
import { dashboardController } from '../controllers/dashboardController.js';
import { requisicaoController } from '../controllers/requisicaoController.js';
import { upload } from '../middleware/upload.js';

export const router = Router();

router.get('/health', (req, res) => res.json({ ok: true }));

router.get('/produtos', asyncHandler(produtoController.list));
router.post('/produtos', asyncHandler(produtoController.create));
router.post(
  '/produtos/:id/componentes',
  asyncHandler(produtoController.addComponente),
);
router.post('/produtos/busca', asyncHandler(produtoController.buscar));

router.get('/estoque', asyncHandler(estoqueController.list));
router.post(
  '/estoque/retirada-producao',
  asyncHandler(estoqueController.retiradaProducao),
);
router.post(
  '/estoque/insumo-extra',
  asyncHandler(estoqueController.insumoExtra),
);

router.post('/ordens-producao/:ordemId/requisicao', requisicaoController.criar);
router.patch('/requisicoes/itens/:itemId', requisicaoController.atenderItem);

router.get('/orcamentos', asyncHandler(orcamentoController.list));
router.get(
  '/orcamentos/templates',
  asyncHandler(orcamentoController.templates),
);
router.post('/orcamentos', asyncHandler(orcamentoController.create));
router.patch(
  '/orcamentos/:id/status',
  asyncHandler(orcamentoController.updateStatus),
);

router.get('/pedidos', asyncHandler(pedidoController.list));
router.post('/pedidos', asyncHandler(pedidoController.create));

router.get('/producao', asyncHandler(producaoController.list));
router.post('/producao', asyncHandler(producaoController.create));
router.post('/producao/iniciar', asyncHandler(producaoController.iniciar));
router.post('/producao/finalizar', asyncHandler(producaoController.finalizar));

router.get('/relatorios-producao', asyncHandler(relatorioController.list));
router.post(
  '/relatorios-producao',
  upload.fields([
    { name: 'foto', maxCount: 1 },
    { name: 'assinatura', maxCount: 1 },
  ]),
  asyncHandler(relatorioController.create),
);

router.get('/dashboard', asyncHandler(dashboardController.resumo));
router.get('/alertas', asyncHandler(dashboardController.alertas));
