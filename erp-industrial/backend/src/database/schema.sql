-- =========================
-- CRIAR BANCO DE DADOS (DB)
-- =========================

CREATE DATABASE erp_industrial;

-- =========================
-- ENTRA NO BANCO
-- =========================

\c erp_industrial

-- =========================
-- EXTENSÕES
-- =========================
CREATE EXTENSION IF NOT EXISTS unaccent;

-- =========================
-- FUNCIONÁRIOS
-- =========================
CREATE TABLE IF NOT EXISTS funcionarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  cpf VARCHAR(14) NOT NULL,
  telefone VARCHAR(20),
  email VARCHAR(120),
  setor VARCHAR(100),
  foto_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (
    status IN ('ativo', 'inativo', 'afastado')
  ),
  criado_em TIMESTAMP DEFAULT NOW(),
  CONSTRAINT funcionarios_cpf_unique UNIQUE (cpf)
);

-- =========================
-- USUÁRIOS (sistema)
-- =========================
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(120) UNIQUE NOT NULL,
  senha TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (
    role IN ('admin', 'vendedor', 'estoquista')
  ),
  criado_em TIMESTAMP DEFAULT NOW()
);

-- =========================
-- CLIENTES
-- =========================
CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  nome_fantasia VARCHAR(120),
  cpf_cnpj VARCHAR(20),
  telefone VARCHAR(20),
  email VARCHAR(120),
  endereco TEXT,
  numero VARCHAR(20),
  bairro VARCHAR(120),
  cidade VARCHAR(120),
  cep VARCHAR(20),
  observacoes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (
    status IN ('ativo', 'inativo')
  ),
  criado_em TIMESTAMP DEFAULT NOW()
);

-- =========================
-- PRODUTOS
-- =========================
CREATE TABLE IF NOT EXISTS produtos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  tipo VARCHAR(30) NOT NULL CHECK (
    tipo IN (
      'materia_prima',
      'revenda',
      'fabricado',
      'conjunto',
      'consumivel'
    )
  ),
  sku VARCHAR(50) UNIQUE,
  estoque_minimo NUMERIC(12,2) DEFAULT 0,
  custo NUMERIC(12,2) DEFAULT 0,
  preco_venda NUMERIC(12,2),
  unidade_medida VARCHAR(10) DEFAULT 'UN',
  ultimo_preco_compra NUMERIC(12,2),
  criado_em TIMESTAMP DEFAULT NOW()
);

-- =========================
-- COMPONENTES (BOM)
-- =========================
CREATE TABLE IF NOT EXISTS componentes_produto (
  id SERIAL PRIMARY KEY,
  produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  componente_id INTEGER NOT NULL REFERENCES produtos(id),
  quantidade NUMERIC(12,2) NOT NULL CHECK (quantidade > 0)
);

-- =========================
-- MOVIMENTOS DE ESTOQUE
-- =========================
CREATE TABLE IF NOT EXISTS movimentos_estoque (
  id SERIAL PRIMARY KEY,
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  quantidade NUMERIC(12,2) NOT NULL,
  tipo_movimento VARCHAR(20) NOT NULL CHECK (
    tipo_movimento IN ('entrada', 'saida', 'ajuste')
  ),
  referencia_tipo VARCHAR(50),
  referencia_id INTEGER,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- =========================
-- CONSUMÍVEIS
-- =========================
CREATE TABLE IF NOT EXISTS consumos_consumiveis (
  id SERIAL PRIMARY KEY,
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  funcionario_id INTEGER NOT NULL REFERENCES funcionarios(id),
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  setor VARCHAR(100),
  quantidade NUMERIC(12,2) NOT NULL,
  assinatura_url TEXT,
  foto_url TEXT,
  justificativa TEXT,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- =========================
-- TRANSPORTADORAS
-- =========================
CREATE TABLE IF NOT EXISTS transportadoras (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  cnpj VARCHAR(20),
  telefone VARCHAR(20),
  email VARCHAR(120),
  cidade VARCHAR(120),
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- =========================
-- ORÇAMENTOS
-- =========================
CREATE TABLE IF NOT EXISTS orcamentos (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
  cliente_nome VARCHAR(120) NOT NULL,
  desconto_geral NUMERIC(12,2) NOT NULL DEFAULT 0,
  observacoes TEXT,
  status VARCHAR(20) NOT NULL CHECK (
    status IN ('rascunho', 'enviado', 'aprovado', 'rejeitado')
  ) DEFAULT 'rascunho',
  criado_em TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS itens_orcamento (
  id SERIAL PRIMARY KEY,
  orcamento_id INTEGER NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  quantidade NUMERIC(12,2) NOT NULL CHECK (quantidade > 0),
  preco_unitario NUMERIC(12,2) NOT NULL CHECK (preco_unitario >= 0),
  desconto_valor NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (desconto_valor >= 0),
  desconto_percentual NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (
    desconto_percentual >= 0 AND desconto_percentual <= 100
  ),
  nome_customizado VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS orcamento_formas_pagamento (
  id SERIAL PRIMARY KEY,
  orcamento_id INTEGER NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
  forma VARCHAR(50) NOT NULL CHECK (
    forma IN (
      'dinheiro',
      'pix',
      'cartao_debito',
      'cartao_credito',
      'boleto',
      'cheque',
      'transferencia',
      'outro'
    )
  ),
  valor NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (valor > 0),
  parcelas INTEGER NOT NULL DEFAULT 1 CHECK (parcelas >= 1),
  ordem INTEGER NOT NULL DEFAULT 0,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orcamento_pagamento_parcelas (
  id SERIAL PRIMARY KEY,
  forma_pagamento_id INTEGER NOT NULL REFERENCES orcamento_formas_pagamento(id) ON DELETE CASCADE,
  numero_parcela INTEGER NOT NULL CHECK (numero_parcela >= 1),
  data_vencimento DATE,
  valor NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (valor >= 0),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =========================
-- VENDAS
-- =========================
CREATE TABLE IF NOT EXISTS vendas (
  id SERIAL PRIMARY KEY,
  orcamento_id INTEGER REFERENCES orcamentos(id),
  cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
  cliente_nome VARCHAR(120) NOT NULL,
  tipo_entrega VARCHAR(20) NOT NULL DEFAULT 'retirada' CHECK (
    tipo_entrega IN ('retirada', 'transportadora')
  ),
  transportadora_id INTEGER REFERENCES transportadoras(id) ON DELETE SET NULL,
  transportadora_nome_manual VARCHAR(150),
  observacoes_entrega TEXT,
  prazo_entrega DATE,
  observacoes TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'aberto' CHECK (
    status IN ('aberto', 'parcial', 'finalizado', 'cancelado')
  ),
  criado_em TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS itens_vendas (
  id SERIAL PRIMARY KEY,
  venda_id INTEGER NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  quantidade NUMERIC(12,2) NOT NULL CHECK (quantidade > 0),
  preco_unitario NUMERIC(12,2) NOT NULL CHECK (preco_unitario >= 0)
);

CREATE TABLE IF NOT EXISTS venda_formas_pagamento (
  id SERIAL PRIMARY KEY,
  venda_id INTEGER NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  forma VARCHAR(50) NOT NULL CHECK (
    forma IN (
      'dinheiro',
      'pix',
      'cartao_debito',
      'cartao_credito',
      'boleto',
      'cheque',
      'transferencia',
      'outro'
    )
  ),
  valor NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (valor > 0),
  parcelas INTEGER NOT NULL DEFAULT 1 CHECK (parcelas >= 1),
  ordem INTEGER NOT NULL DEFAULT 0,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS venda_pagamento_parcelas (
  id SERIAL PRIMARY KEY,
  forma_pagamento_id INTEGER NOT NULL REFERENCES venda_formas_pagamento(id) ON DELETE CASCADE,
  numero_parcela INTEGER NOT NULL CHECK (numero_parcela >= 1),
  data_vencimento DATE,
  valor NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (valor >= 0),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =========================
-- PRODUÇÃO
-- =========================
CREATE TABLE IF NOT EXISTS ordens_producao (
  id SERIAL PRIMARY KEY,
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  venda_id INTEGER REFERENCES vendas(id) ON DELETE SET NULL,
  quantidade NUMERIC(12,2) NOT NULL,
  status VARCHAR(30) NOT NULL CHECK (
    status IN ('pendente', 'em_producao', 'finalizado')
  ) DEFAULT 'pendente',
  criado_em TIMESTAMP DEFAULT NOW()
);

-- =========================
-- ENTREGAS
-- =========================
CREATE TABLE IF NOT EXISTS entregas (
  id SERIAL PRIMARY KEY,
  ordem_producao_id INTEGER REFERENCES ordens_producao(id) ON DELETE SET NULL,
  venda_id INTEGER REFERENCES vendas(id) ON DELETE SET NULL,
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  quantidade NUMERIC(12,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'entregue')),
  tipo VARCHAR(20) DEFAULT 'retirada'
    CHECK (tipo IN ('retirada', 'transportadora')),
  transportadora_id INTEGER REFERENCES transportadoras(id) ON DELETE SET NULL,
  transportadora_nome_manual VARCHAR(150),
  usuario_id INTEGER REFERENCES usuarios(id),
  criado_em TIMESTAMP DEFAULT NOW(),
  entregue_em TIMESTAMP
);

-- =========================
-- RELATÓRIO DE PRODUÇÃO
-- =========================
CREATE TABLE IF NOT EXISTS relatorios_producao (
  id SERIAL PRIMARY KEY,
  ordem_producao_id INTEGER NOT NULL REFERENCES ordens_producao(id) ON DELETE CASCADE,
  funcionario_id INTEGER REFERENCES funcionarios(id) ON DELETE SET NULL,
  nome_funcionario VARCHAR(120) NOT NULL,
  descricao TEXT NOT NULL,
  assinatura_url TEXT,
  criado_em TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS relatorio_producao_fotos (
  id SERIAL PRIMARY KEY,
  relatorio_producao_id INTEGER NOT NULL REFERENCES relatorios_producao(id) ON DELETE CASCADE,
  foto_url TEXT NOT NULL,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- =========================
-- RESERVAS_VENDA
-- =========================
CREATE TABLE IF NOT EXISTS reservas_venda (
  id SERIAL PRIMARY KEY,
  venda_id INTEGER NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  quantidade NUMERIC(12,2) NOT NULL CHECK (quantidade > 0),
  origem_movimento_id INTEGER REFERENCES movimentos_estoque(id),
  status VARCHAR(20) NOT NULL DEFAULT 'reservado'
    CHECK (status IN ('reservado', 'atendido', 'cancelado')),
  criado_em TIMESTAMP DEFAULT NOW()
);

-- =========================
-- ÍNDICES
-- =========================
CREATE INDEX IF NOT EXISTS idx_clientes_nome
ON clientes(nome);

CREATE INDEX IF NOT EXISTS idx_clientes_nome_fantasia
ON clientes(nome_fantasia);

CREATE INDEX IF NOT EXISTS idx_clientes_cpf_cnpj
ON clientes(cpf_cnpj);

CREATE INDEX IF NOT EXISTS idx_orcamentos_cliente_id
ON orcamentos(cliente_id);

CREATE INDEX IF NOT EXISTS idx_orcamentos_status
ON orcamentos(status);

CREATE INDEX IF NOT EXISTS idx_itens_orcamento_orcamento
ON itens_orcamento(orcamento_id);

CREATE INDEX IF NOT EXISTS idx_orcamento_formas_pagamento_orcamento
ON orcamento_formas_pagamento(orcamento_id);

CREATE INDEX IF NOT EXISTS idx_orcamento_pagamento_parcelas_forma
ON orcamento_pagamento_parcelas(forma_pagamento_id);

CREATE INDEX IF NOT EXISTS idx_vendas_orcamento_id
ON vendas(orcamento_id);

CREATE INDEX IF NOT EXISTS idx_vendas_cliente_id
ON vendas(cliente_id);

CREATE INDEX IF NOT EXISTS idx_vendas_status
ON vendas(status);

CREATE INDEX IF NOT EXISTS idx_itens_vendas_venda
ON itens_vendas(venda_id);

CREATE INDEX IF NOT EXISTS idx_venda_formas_pagamento_venda
ON venda_formas_pagamento(venda_id);

CREATE INDEX IF NOT EXISTS idx_venda_pagamento_parcelas_forma
ON venda_pagamento_parcelas(forma_pagamento_id);

CREATE INDEX IF NOT EXISTS idx_movimentos_produto
ON movimentos_estoque(produto_id);

CREATE INDEX IF NOT EXISTS idx_consumos_produto_usuario
ON consumos_consumiveis(produto_id, usuario_id);

CREATE INDEX IF NOT EXISTS idx_consumos_funcionario
ON consumos_consumiveis(funcionario_id);

CREATE INDEX IF NOT EXISTS idx_consumos_data
ON consumos_consumiveis(criado_em);

CREATE INDEX IF NOT EXISTS idx_entregas_status
ON entregas(status);

CREATE INDEX IF NOT EXISTS idx_entregas_venda
ON entregas(venda_id);

CREATE INDEX IF NOT EXISTS idx_transportadoras_nome
ON transportadoras(nome);

CREATE INDEX IF NOT EXISTS idx_relatorios_producao_ordem
ON relatorios_producao(ordem_producao_id);

CREATE INDEX IF NOT EXISTS idx_relatorio_producao_fotos_relatorio
ON relatorio_producao_fotos(relatorio_producao_id);