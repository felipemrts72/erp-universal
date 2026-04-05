function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatDate(date = new Date()) {
  return new Date(date).toLocaleDateString('pt-BR');
}

export function gerarHtmlDocumento({
  tipo = 'orcamento',
  empresa,
  cliente,
  itens,
  totais,
  assinaturaProprietarioUrl,
}) {
  const titulo = tipo === 'venda' ? 'PEDIDO DE VENDA' : 'ORÇAMENTO';

  const mostrarAssinaturaProprietario = tipo === 'orcamento';

  const itensHtml = itens
    .map(
      (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.nome_customizado || item.produto_nome || '-'}</td>
          <td>${item.quantidade}</td>
          <td>${formatMoney(item.preco_unitario)}</td>
          <td>${item.desconto_label || '-'}</td>
          <td>${formatMoney(item.total_liquido)}</td>
        </tr>
      `,
    )
    .join('');

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>${titulo}</title>
        <style>
          @page {
            size: A4;
            margin: 16mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            font-family: Arial, sans-serif;
            color: #1f2937;
            margin: 0;
            background: #fff;
          }

          .documento {
            width: 100%;
          }

          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #1d4ed8;
            padding-bottom: 12px;
            margin-bottom: 18px;
          }

          .header__logo {
            max-width: 120px;
            max-height: 80px;
            object-fit: contain;
          }

          .header__empresa {
            flex: 1;
            margin-left: 18px;
          }

          .header__titulo {
            font-size: 24px;
            font-weight: 700;
            color: #1e3a8a;
            margin-bottom: 8px;
          }

          .bloco {
            margin-bottom: 18px;
          }

          .bloco__titulo {
            font-size: 15px;
            font-weight: 700;
            margin-bottom: 8px;
            color: #1e3a8a;
          }

          .linha {
            margin-bottom: 4px;
            font-size: 13px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
          }

          th, td {
            border: 1px solid #d1d5db;
            padding: 8px;
            font-size: 12px;
            text-align: left;
          }

          th {
            background: #eff6ff;
            color: #1e3a8a;
          }

          .totais {
            width: 340px;
            margin-left: auto;
            margin-top: 18px;
          }

          .totais__linha {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            border-bottom: 1px solid #e5e7eb;
            font-size: 13px;
          }

          .totais__linha--final {
            font-size: 18px;
            font-weight: 700;
            color: #111827;
            border-bottom: 2px solid #1d4ed8;
            margin-top: 6px;
          }

          .assinaturas {
            display: flex;
            justify-content: space-between;
            gap: 40px;
            margin-top: 70px;
          }

          .assinatura {
            flex: 1;
            text-align: center;
          }

          .assinatura__imagem {
            max-height: 60px;
            max-width: 180px;
            object-fit: contain;
            display: block;
            margin: 0 auto 8px;
          }

          .assinatura__linha {
            border-top: 1px solid #111827;
            padding-top: 8px;
            font-size: 13px;
          }

          .disclaimer {
            margin-top: 20px;
            font-size: 11px;
            color: #4b5563;
            line-height: 1.5;
          }
        </style>
      </head>
      <body>
        <div class="documento">
          <div class="header">
            <img class="header__logo" src="${empresa.logoUrl || ''}" alt="Logo" />
            <div class="header__empresa">
              <div class="header__titulo">${titulo}</div>
              <div class="linha"><strong>${empresa.nome || ''}</strong></div>
              <div class="linha">${empresa.endereco || ''}</div>
              <div class="linha">${empresa.cidade || ''} - ${empresa.estado || ''}</div>
              <div class="linha">Telefone: ${empresa.telefone || ''}</div>
              <div class="linha">E-mail: ${empresa.email || ''}</div>
              <div class="linha">Data: ${formatDate()}</div>
            </div>
          </div>

          <div class="bloco">
            <div class="bloco__titulo">Dados do cliente</div>
            <div class="linha"><strong>Nome:</strong> ${cliente.nome || '-'}</div>
            <div class="linha"><strong>Endereço:</strong> ${cliente.endereco || '-'}</div>
            <div class="linha"><strong>Cidade:</strong> ${cliente.cidade || '-'}</div>
            <div class="linha"><strong>CEP:</strong> ${cliente.cep || '-'}</div>
          </div>

          <div class="bloco">
            <div class="bloco__titulo">Itens</div>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Descrição</th>
                  <th>Qtd.</th>
                  <th>Valor unitário</th>
                  <th>Desconto</th>
                  <th>Total líquido</th>
                </tr>
              </thead>
              <tbody>
                ${itensHtml}
              </tbody>
            </table>
          </div>

          <div class="totais">
            <div class="totais__linha">
              <span>Total bruto</span>
              <strong>${formatMoney(totais.bruto)}</strong>
            </div>
            <div class="totais__linha">
              <span>Desconto dos itens</span>
              <strong>${formatMoney(totais.descontoItens)}</strong>
            </div>
            <div class="totais__linha">
              <span>Desconto geral</span>
              <strong>${formatMoney(totais.descontoGeral)}</strong>
            </div>
            <div class="totais__linha totais__linha--final">
              <span>Total líquido</span>
              <strong>${formatMoney(totais.liquido)}</strong>
            </div>
          </div>

          <div class="disclaimer">
            ${
              tipo === 'venda'
                ? 'Declaro estar de acordo com os itens, valores e condições desta venda.'
                : 'Este orçamento foi apresentado ao cliente para análise e aprovação.'
            }
          </div>

          <div class="assinaturas">
            <div class="assinatura">
              ${
                mostrarAssinaturaProprietario && assinaturaProprietarioUrl
                  ? `<img class="assinatura__imagem" src="${assinaturaProprietarioUrl}" alt="Assinatura do proprietário" />`
                  : ''
              }
              ${
                mostrarAssinaturaProprietario
                  ? '<div class="assinatura__linha">Assinatura do proprietário</div>'
                  : '<div class="assinatura__linha">&nbsp;</div>'
              }
            </div>

            <div class="assinatura">
              <div class="assinatura__linha">Assinatura do cliente</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}
export function imprimirDocumento(html) {
  const printWindow = window.open('', '_blank', 'width=900,height=700');

  if (!printWindow) {
    throw new Error('Não foi possível abrir a janela de impressão');
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}
