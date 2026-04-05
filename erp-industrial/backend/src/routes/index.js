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
import { authController } from '../controllers/authController.js';
import { funcionarioController } from '../controllers/funcionarioController.js';
import { consumivelController } from '../controllers/consumivelController.js';
import { entregaController } from '../controllers/entregaController.js';
import { clienteController } from '../controllers/clienteController.js';
import { authMiddleware } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { normalizeNumbers } from '../middleware/numbers.js';

export const router = Router();
router.get('/health', (req, res) => res.json({ ok: true }));

// públicas
router.post('/login', asyncHandler(authController.login));

// protegidas
router.use(authMiddleware);
router.use(normalizeNumbers);

router.post('/usuarios', asyncHandler(authController.register));

// PRODUTOS
router.get('/produtos', asyncHandler(produtoController.list));
router.post('/produtos', asyncHandler(produtoController.create));
router.post(
  '/produtos/:id/componentes',
  asyncHandler(produtoController.addComponente),
);
router.get('/produtos/busca', asyncHandler(produtoController.buscar));

// ESTOQUE
router.get('/estoque', asyncHandler(estoqueController.list));
router.post('/estoque/entrada', asyncHandler(estoqueController.entrada));
router.get('/estoque/movimentos', asyncHandler(estoqueController.movimentos));
router.get(
  '/estoque/movimentos/busca',
  asyncHandler(estoqueController.buscarMovimentos),
);
router.get('/estoque/busca', asyncHandler(estoqueController.buscar));
router.post('/estoque/ajuste', asyncHandler(estoqueController.ajuste));

// REQUISIÇÕES
router.post(
  '/ordens-producao/:ordemId/requisicao',
  asyncHandler(requisicaoController.criar),
);
router.patch(
  '/requisicoes/itens/:itemId',
  asyncHandler(requisicaoController.atenderItem),
);

// CONSUMÍVEIS
router.post('/consumiveis', asyncHandler(consumivelController.registrar));

router.get('/consumiveis', asyncHandler(consumivelController.listar));

router.get('/consumiveis/alertas', asyncHandler(consumivelController.alertas));

router.get(
  '/consumiveis/relatorio-mensal',
  asyncHandler(consumivelController.relatorioMensal),
);
router.patch(
  '/consumiveis/:id/justificar',
  asyncHandler(consumivelController.justificar),
);

// ORÇAMENTOS
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
router.get('/orcamentos/busca', asyncHandler(orcamentoController.buscar));
router.post('/orcamentos/venda', asyncHandler(orcamentoController.venda));

// PEDIDOS
router.get('/pedidos', asyncHandler(pedidoController.list));
router.post('/pedidos', asyncHandler(pedidoController.create));

// PRODUÇÕES
router.get('/producao', asyncHandler(producaoController.list));
router.post('/producao', asyncHandler(producaoController.create));
router.post('/producao/iniciar', asyncHandler(producaoController.iniciar));
router.post('/producao/finalizar', asyncHandler(producaoController.finalizar));

// RELATÓRIOS-PRODUÇÃO
router.get('/relatorios-producao', asyncHandler(relatorioController.list));
router.post(
  '/relatorios-producao',
  upload.fields([
    { name: 'foto', maxCount: 1 },
    { name: 'assinatura', maxCount: 1 },
  ]),
  asyncHandler(relatorioController.create),
);

// DASHBOARD
router.get('/dashboard', asyncHandler(dashboardController.resumo));
router.get('/alertas', asyncHandler(dashboardController.alertas));

// FUNCIONÁRIOS
router.post('/funcionarios', asyncHandler(funcionarioController.create));
router.get('/funcionarios', asyncHandler(funcionarioController.list));
router.patch('/funcionarios/:id', asyncHandler(funcionarioController.update));
router.delete('/funcionarios/:id', asyncHandler(funcionarioController.delete));
router.get('/funcionarios/busca', asyncHandler(funcionarioController.buscar));

// ENTREGAS
router.get('/entregas/pendentes', asyncHandler(entregaController.pendentes));
router.get('/entregas', asyncHandler(entregaController.listar));

router.patch(
  '/entregas/:id/entregar',
  asyncHandler(entregaController.entregar),
);

// CLIENTES
router.post('/clientes', asyncHandler(clienteController.create));
router.get('/clientes', asyncHandler(clienteController.list));
router.patch('/clientes/:id', asyncHandler(clienteController.update));
router.delete('/clientes/:id', asyncHandler(clienteController.delete));
router.get('/clientes/busca', asyncHandler(clienteController.buscar));
