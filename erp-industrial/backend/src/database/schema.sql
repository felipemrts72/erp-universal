CREATE TABLE IF NOT EXISTS produtos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('materia_prima', 'revenda', 'fabricado', 'conjunto')),
  sku VARCHAR(50) UNIQUE,
  estoque_minimo NUMERIC(12,2) DEFAULT 0,
  criado_em TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS componentes_produto (
  id SERIAL PRIMARY KEY,
  produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  componente_id INTEGER NOT NULL REFERENCES produtos(id),
  quantidade NUMERIC(12,2) NOT NULL CHECK (quantidade > 0)
);

CREATE TABLE IF NOT EXISTS movimentos_estoque (
  id SERIAL PRIMARY KEY,
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  quantidade NUMERIC(12,2) NOT NULL,
  tipo_movimento VARCHAR(20) NOT NULL CHECK (tipo_movimento IN ('entrada', 'saida', 'producao', 'ajuste')),
  referencia_tipo VARCHAR(40),
  referencia_id INTEGER,
  criado_em TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orcamentos (
  id SERIAL PRIMARY KEY,
  cliente_nome VARCHAR(120) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('rascunho', 'enviado', 'aprovado', 'rejeitado')) DEFAULT 'rascunho',
  criado_em TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS itens_orcamento (
  id SERIAL PRIMARY KEY,
  orcamento_id INTEGER NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  quantidade NUMERIC(12,2) NOT NULL,
  preco_unitario NUMERIC(12,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS pedidos (
  id SERIAL PRIMARY KEY,
  orcamento_id INTEGER REFERENCES orcamentos(id),
  cliente_nome VARCHAR(120) NOT NULL,
  status VARCHAR(30) DEFAULT 'aberto',
  criado_em TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS itens_pedido (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  quantidade NUMERIC(12,2) NOT NULL,
  preco_unitario NUMERIC(12,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS ordens_producao (
  id SERIAL PRIMARY KEY,
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  quantidade NUMERIC(12,2) NOT NULL,
  status VARCHAR(30) NOT NULL CHECK (status IN ('pendente', 'em_producao', 'aguardando_pecas', 'finalizado')) DEFAULT 'pendente',
  criado_em TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS relatorios_producao (
  id SERIAL PRIMARY KEY,
  ordem_producao_id INTEGER NOT NULL REFERENCES ordens_producao(id) ON DELETE CASCADE,
  nome_funcionario VARCHAR(120) NOT NULL,
  descricao TEXT NOT NULL,
  foto_url TEXT,
  assinatura_url TEXT,
  criado_em TIMESTAMP DEFAULT NOW()
);
