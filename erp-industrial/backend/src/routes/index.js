import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { produtoController } from '../controllers/produtoController.js';
import { estoqueController } from '../controllers/estoqueController.js';
import { orcamentoController } from '../controllers/orcamentoController.js';
import { vendaController } from '../controllers/vendaController.js';
import { producaoController } from '../controllers/producaoController.js';
import { relatorioController } from '../controllers/relatorioController.js';
import { dashboardController } from '../controllers/dashboardController.js';
import { requisicaoController } from '../controllers/requisicaoController.js';
import { authController } from '../controllers/authController.js';
import { funcionarioController } from '../controllers/funcionarioController.js';
import { consumivelController } from '../controllers/consumivelController.js';
import { entregaController } from '../controllers/entregaController.js';
import { clienteController } from '../controllers/clienteController.js';
import { reservaVendaController } from '../controllers/reservaVendaController.js';
import { transportadoraController } from '../controllers/transportadoraController.js';
import { authMiddleware, isAdmin } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { normalizeNumbers } from '../middleware/numbers.js';

export const router = Router();
router.get('/health', (req, res) => res.json({ ok: true }));

// públicas
router.post('/login', asyncHandler(authController.login));

// protegidas
router.use(authMiddleware);
router.use(normalizeNumbers);

router.get('/auth/me', asyncHandler(authController.me));
router.post('/usuarios', asyncHandler(authController.register));

// PRODUTOS
router.get('/produtos', asyncHandler(produtoController.list));
router.get('/produtos/busca', asyncHandler(produtoController.buscar));
router.get('/produtos/:id', asyncHandler(produtoController.getById));
router.post('/produtos', asyncHandler(produtoController.create));
router.post(
  '/produtos/:id/componentes',
  asyncHandler(produtoController.addComponente),
);

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
router.get('/orcamentos/busca', asyncHandler(orcamentoController.buscar));
router.get('/orcamentos/:id', asyncHandler(orcamentoController.getById));

router.post('/orcamentos', asyncHandler(orcamentoController.create));
router.post('/orcamentos/:id/clonar', asyncHandler(orcamentoController.clonar));

router.patch('/orcamentos/:id', asyncHandler(orcamentoController.update));
router.patch(
  '/orcamentos/:id/status',
  asyncHandler(orcamentoController.updateStatus),
);
router.post(
  '/orcamentos/:id/aprovar',
  asyncHandler(orcamentoController.aprovar),
);

// VENDAS
router.get('/vendas', asyncHandler(vendaController.list));
router.post('/vendas', asyncHandler(vendaController.create));

// opcional (se quiser manter fluxo via orçamento)
router.post(
  '/vendas/from-orcamento',
  asyncHandler(vendaController.createFromOrcamento),
);

//RESERVAS DA VENDA
router.get(
  '/reservas-venda/pendentes-compra',
  asyncHandler(reservaVendaController.listarPendentesCompra),
);
router.post(
  '/reservas-venda/vincular-entrada',
  asyncHandler(reservaVendaController.vincularEntrada),
);

// PRODUÇÕES
router.get('/producao', asyncHandler(producaoController.list));
router.post('/producao', asyncHandler(producaoController.create));
router.post('/producao/iniciar', asyncHandler(producaoController.iniciar));
router.post('/producao/finalizar', asyncHandler(producaoController.finalizar));

// RELATÓRIOS-PRODUÇÃO
router.get('/relatorios-producao', asyncHandler(relatorioController.list));
router.post(
  '/relatorios-producao',
  upload.fields([{ name: 'fotos', maxCount: 5 }]),
  asyncHandler(relatorioController.create),
);

// AUDITORIA-PRODUÇÃO
router.get(
  '/auditoria-producao',
  isAdmin,
  asyncHandler(relatorioController.auditoriaResumo),
);

router.get(
  '/auditoria-producao/indicadores',
  isAdmin,
  asyncHandler(relatorioController.indicadores),
);

router.get(
  '/auditoria-producao/:ordemId',
  isAdmin,
  asyncHandler(relatorioController.auditoriaDetalhe),
);

// DASHBOARD
router.get('/dashboard/resumo', asyncHandler(dashboardController.resumo));
router.get('/dashboard/alertas', asyncHandler(dashboardController.alertas));
router.get(
  '/dashboard/financeiro',
  isAdmin,
  asyncHandler(dashboardController.financeiro),
);

// FUNCIONÁRIOS
router.post('/funcionarios', asyncHandler(funcionarioController.create));
router.get('/funcionarios', asyncHandler(funcionarioController.list));
router.patch('/funcionarios/:id', asyncHandler(funcionarioController.update));
router.delete('/funcionarios/:id', asyncHandler(funcionarioController.delete));
router.get('/funcionarios/busca', asyncHandler(funcionarioController.buscar));

// ENTREGAS
router.get('/entregas/pendentes', asyncHandler(entregaController.pendentes));
router.get('/entregas/saidas-hoje', asyncHandler(entregaController.saidasHoje));
router.get('/entregas', asyncHandler(entregaController.listar));
router.patch(
  '/entregas/:id/entregar',
  asyncHandler(entregaController.entregar),
);

// AUDITORIA-ENTREGAS
router.get(
  '/auditoria-entregas',
  isAdmin,
  asyncHandler(entregaController.auditoriaResumo),
);

router.get(
  '/auditoria-entregas/indicadores',
  isAdmin,
  asyncHandler(entregaController.auditoriaIndicadores),
);

router.get(
  '/auditoria-entregas/:id',
  isAdmin,
  asyncHandler(entregaController.auditoriaDetalhe),
);

// TRANSPORTADORAS
router.get('/transportadoras', asyncHandler(transportadoraController.list));
router.get(
  '/transportadoras/busca',
  asyncHandler(transportadoraController.buscar),
);
router.get(
  '/transportadoras/:id',
  asyncHandler(transportadoraController.getById),
);
router.post(
  '/transportadoras',
  isAdmin,
  asyncHandler(transportadoraController.create),
);
router.patch(
  '/transportadoras/:id',
  isAdmin,
  asyncHandler(transportadoraController.update),
);
router.delete(
  '/transportadoras/:id',
  isAdmin,
  asyncHandler(transportadoraController.delete),
);

// CLIENTES
router.post('/clientes', asyncHandler(clienteController.create));
router.get('/clientes', asyncHandler(clienteController.list));
router.get('/clientes/busca', asyncHandler(clienteController.buscar));
router.get('/clientes/:id', asyncHandler(clienteController.getById));
router.patch('/clientes/:id', asyncHandler(clienteController.update));
router.delete('/clientes/:id', asyncHandler(clienteController.delete));
