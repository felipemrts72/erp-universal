-- =========================
-- CRIAR BANCO DE DADOS (DB)
-- =========================

CREATE DATABASE erp_industrial;

-- =========================
-- ENTRA NO BANCO
-- =========================

\c erp_industrial

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
  cpf_cnpj VARCHAR(20),
  telefone VARCHAR(20),
  email VARCHAR(120),
  endereco TEXT,
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
-- ORÇAMENTOS
-- =========================
CREATE TABLE IF NOT EXISTS orcamentos (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
  cliente_nome VARCHAR(120) NOT NULL,
  desconto_geral NUMERIC(12,2) NOT NULL DEFAULT 0,
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

-- =========================
-- VENDAS
-- =========================
CREATE TABLE IF NOT EXISTS vendas (
  id SERIAL PRIMARY KEY,
  orcamento_id INTEGER REFERENCES orcamentos(id),
  cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
  cliente_nome VARCHAR(120) NOT NULL,
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
  nome_funcionario VARCHAR(120) NOT NULL,
  descricao TEXT NOT NULL,
  foto_url TEXT,
  assinatura_url TEXT,
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

CREATE INDEX IF NOT EXISTS idx_clientes_cpf_cnpj
ON clientes(cpf_cnpj);

CREATE INDEX IF NOT EXISTS idx_orcamentos_cliente_id
ON orcamentos(cliente_id);

CREATE INDEX IF NOT EXISTS idx_orcamentos_status
ON orcamentos(status);

CREATE INDEX IF NOT EXISTS idx_itens_orcamento_orcamento
ON itens_orcamento(orcamento_id);

CREATE INDEX IF NOT EXISTS idx_vendas_orcamento_id
ON vendas(orcamento_id);

CREATE INDEX IF NOT EXISTS idx_vendas_cliente_id
ON vendas(cliente_id);

CREATE INDEX IF NOT EXISTS idx_vendas_status
ON vendas(status);

CREATE INDEX IF NOT EXISTS idx_itens_vendas_venda
ON itens_vendas(venda_id);

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