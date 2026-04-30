import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/Card';
import LoadingModal from '../../components/LoadingModal';
import './style.css';

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR');
}

function formatDateOnly(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('pt-BR');
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    maximumFractionDigits: 3,
  });
}

function getPrazoLabel(dias) {
  if (dias === null || dias === undefined) return 'Sem prazo';
  if (dias < 0) return `${Math.abs(dias)} dias atrasado`;
  if (dias === 0) return 'Entrega hoje';
  return `${dias} dias restantes`;
}

function toTitleCase(value) {
  if (!value) return '-';

  return String(value)
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(' ');
}

function formatStatusEntrega(value) {
  if (!value) return '-';

  const map = {
    pendente: 'Pendente',
    entregue: 'Entregue',
    retirada: 'Retirada',
    transportadora: 'Transportadora',
  };

  return map[value] || toTitleCase(value.replaceAll('_', ' '));
}

function formatTipoProduto(value) {
  const map = {
    materia_prima: 'Matéria-prima',
    revenda: 'Revenda',
    consumivel: 'Consumível',
    fabricado: 'Fabricado',
    conjunto: 'Conjunto',
  };

  return map[value] || toTitleCase(String(value || '-').replaceAll('_', ' '));
}

export default function Auditoria() {
  const [loading, setLoading] = useState(false);
  const [ordens, setOrdens] = useState([]);
  const [indicadores, setIndicadores] = useState({
    itensMaisProduzidos: [],
    funcionariosMaisAtivos: [],
  });
  const [ordemSelecionada, setOrdemSelecionada] = useState(null);
  const [detalhes, setDetalhes] = useState([]);
  const [busca, setBusca] = useState('');
  const [abaAtiva, setAbaAtiva] = useState('producao');

  const [consumiveis, setConsumiveis] = useState([]);
  const [indicadoresConsumiveis, setIndicadoresConsumiveis] = useState([]);

  const [entregas, setEntregas] = useState([]);
  const [indicadoresEntregas, setIndicadoresEntregas] = useState({
    statusEntrega: [],
    porTipo: [],
    transportadorasMaisUsadas: [],
  });
  const [entregaSelecionada, setEntregaSelecionada] = useState(null);
  const [detalheEntrega, setDetalheEntrega] = useState(null);

  const [consumivelSelecionado, setConsumivelSelecionado] = useState(null);
  const [detalheConsumivel, setDetalheConsumivel] = useState(null);

  const [imagemPreview, setImagemPreview] = useState(null);

  const load = async () => {
    try {
      setLoading(true);

      const [
        resumoProducaoRes,
        indicadoresProducaoRes,
        resumoEntregasRes,
        indicadoresEntregasRes,
        consumiveisRes,
        indicadoresConsumiveisRes,
      ] = await Promise.all([
        api.get('/auditoria'),
        api.get('/auditoria/indicadores'),
        api.get('/auditoria-entregas'),
        api.get('/auditoria-entregas/indicadores'),
        api.get('/auditoria-consumiveis'),
        api.get('/auditoria-consumiveis/indicadores'),
      ]);

      setOrdens(
        Array.isArray(resumoProducaoRes.data) ? resumoProducaoRes.data : [],
      );
      setIndicadores(indicadoresProducaoRes.data || {});

      setEntregas(
        Array.isArray(resumoEntregasRes.data) ? resumoEntregasRes.data : [],
      );
      setIndicadoresEntregas(indicadoresEntregasRes.data || {});

      setConsumiveis(
        Array.isArray(consumiveisRes.data) ? consumiveisRes.data : [],
      );

      setIndicadoresConsumiveis(
        Array.isArray(indicadoresConsumiveisRes.data)
          ? indicadoresConsumiveisRes.data
          : [],
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const abrirDetalhes = async (ordem) => {
    setOrdemSelecionada(ordem);
    setLoading(true);

    try {
      const { data } = await api.get(`/auditoria/${ordem.id}`);
      setDetalhes(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  const abrirDetalheEntrega = async (entrega) => {
    setLoading(true);
    setEntregaSelecionada(entrega);

    try {
      const { data } = await api.get(`/auditoria-entregas/${entrega.id}`);
      setDetalheEntrega(data);
    } finally {
      setLoading(false);
    }
  };

  const ordensFiltradas = useMemo(() => {
    return ordens.filter((ordem) => {
      const texto =
        `${ordem.id} ${ordem.produto_nome || ''} ${ordem.cliente_nome || ''} ${ordem.ultimo_funcionario || ''}`.toLowerCase();

      return texto.includes(busca.toLowerCase());
    });
  }, [ordens, busca]);

  const entregasFiltradas = useMemo(() => {
    return entregas.filter((entrega) => {
      const texto =
        `${entrega.id} ${entrega.cliente_nome || ''} ${entrega.produto_nome || ''} ${entrega.transportadora_nome || ''} ${entrega.transportadora_nome_manual || ''} ${entrega.nome_recebedor || ''} ${entrega.documento_recebedor || ''} ${entrega.codigo_rastreio || ''} ${entrega.placa_veiculo || ''}`.toLowerCase();

      return texto.includes(busca.toLowerCase());
    });
  }, [entregas, busca]);

  const consumiveisFiltrados = useMemo(() => {
    return consumiveis.filter((item) => {
      const texto =
        `${item.id} ${item.produto_nome || ''} ${item.funcionario_nome || ''} ${item.setor || ''}`.toLowerCase();

      return texto.includes(busca.toLowerCase());
    });
  }, [consumiveis, busca]);

  const API_BASE = (
    import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
  ).replace('/api', '');

  const montarUrlArquivo = (url) => {
    if (!url) return '';

    if (String(url).startsWith('http')) return url;

    return `${API_BASE}${url}`;
  };

  const abrirDetalheConsumivel = async (retirada) => {
    setLoading(true);
    setConsumivelSelecionado(retirada);

    try {
      const { data } = await api.get(`/auditoria-consumiveis/${retirada.id}`);
      setDetalheConsumivel(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading && <LoadingModal />}

      <Card
        title='Auditoria'
        subtitle='Visão gerencial das ordens, relatórios, entregas e reposições.'
      >
        <div className='auditoria__tabs'>
          <button
            type='button'
            className={`btn ${abaAtiva === 'producao' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setAbaAtiva('producao')}
          >
            Produção
          </button>

          <button
            type='button'
            className={`btn ${abaAtiva === 'consumiveis' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setAbaAtiva('consumiveis')}
          >
            Consumíveis
          </button>

          <button
            type='button'
            className={`btn ${abaAtiva === 'entregas' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setAbaAtiva('entregas')}
          >
            Entregas
          </button>
        </div>

        {abaAtiva === 'producao' && (
          <>
            <input
              className='auditoria__search'
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder='Buscar por OP, produto, cliente ou funcionário'
            />

            <div className='auditoria__indicadores'>
              <div className='auditoria__indicador-card'>
                <h3>Itens mais produzidos</h3>
                {indicadores.itensMaisProduzidos?.length ? (
                  indicadores.itensMaisProduzidos.map((item) => (
                    <div key={item.produto_nome}>
                      {item.produto_nome} -{' '}
                      <strong>{item.total_produzido}</strong>
                    </div>
                  ))
                ) : (
                  <div>Nenhum dado</div>
                )}
              </div>

              <div className='auditoria__indicador-card'>
                <h3>Funcionários mais ativos</h3>
                {indicadores.funcionariosMaisAtivos?.length ? (
                  indicadores.funcionariosMaisAtivos.map((item) => (
                    <div key={item.nome_funcionario}>
                      {item.nome_funcionario}
                      {item.setor ? ` (${item.setor})` : ''} -{' '}
                      <strong>{item.total_relatorios}</strong>
                    </div>
                  ))
                ) : (
                  <div>Nenhum dado</div>
                )}
              </div>

              <div className='auditoria__indicador-card'>
                <h3>Produção por setor</h3>
                {indicadores.producaoPorSetor?.length ? (
                  indicadores.producaoPorSetor.map((item) => (
                    <div key={item.setor}>
                      {item.setor} - <strong>{item.total_relatorios}</strong>
                    </div>
                  ))
                ) : (
                  <div>Nenhum dado</div>
                )}
              </div>
            </div>

            <div className='auditoria__cards'>
              {ordensFiltradas.map((ordem) => (
                <article
                  key={ordem.id}
                  className='auditoria__card'
                  onClick={() => abrirDetalhes(ordem)}
                >
                  <h3>OP #{ordem.id}</h3>
                  <p>
                    <strong>Produto:</strong> {ordem.produto_nome}
                  </p>
                  <p>
                    <strong>Cliente:</strong> {ordem.cliente_nome || '-'}
                  </p>
                  <p>
                    <strong>Quantidade:</strong> {ordem.quantidade}
                  </p>
                  <p>
                    <strong>Criada em:</strong> {formatDate(ordem.criado_em)}
                  </p>
                  <p>
                    <strong>Prazo:</strong>{' '}
                    {formatDateOnly(ordem.prazo_entrega)}
                  </p>
                  <p>
                    <strong>Situação do prazo:</strong>{' '}
                    {getPrazoLabel(ordem.dias_para_entrega)}
                  </p>
                  <p>
                    <strong>Dias em aberto:</strong>{' '}
                    {ordem.dias_em_aberto ?? '-'}
                  </p>
                  <p>
                    <strong>Último funcionário:</strong>{' '}
                    {ordem.ultimo_funcionario || '-'}
                  </p>
                  <p>
                    <strong>Relatórios enviados:</strong>{' '}
                    {ordem.total_relatorios}
                  </p>
                </article>
              ))}
            </div>
          </>
        )}

        {abaAtiva === 'consumiveis' && (
          <>
            <input
              className='auditoria__search'
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder='Buscar por consumível, funcionário ou setor'
            />

            <div className='auditoria__indicadores'>
              <div className='auditoria__indicador-card'>
                <h3>Retiradas no mês</h3>
                <strong>{consumiveis.length}</strong>
              </div>

              <div className='auditoria__indicador-card'>
                <h3>Funcionários com retirada</h3>
                <strong>
                  {new Set(consumiveis.map((item) => item.funcionario_id)).size}
                </strong>
              </div>

              <div className='auditoria__indicador-card auditoria__indicador-card--warning'>
                <h3>Maior consumo</h3>
                <strong>
                  {indicadoresConsumiveis[0]
                    ? `${indicadoresConsumiveis[0].funcionario_nome} - ${formatNumber(indicadoresConsumiveis[0].total_consumido)}`
                    : '-'}
                </strong>
              </div>
            </div>

            <div className='auditoria__cards'>
              {indicadoresConsumiveis.length ? (
                indicadoresConsumiveis.map((item, index) => (
                  <article
                    key={`${item.funcionario_nome}-${item.produto_nome}-${index}`}
                    className='auditoria__card'
                  >
                    <h3>{item.funcionario_nome}</h3>

                    <p>
                      <strong>Setor:</strong> {item.setor || '-'}
                    </p>

                    <p>
                      <strong>Consumível:</strong> {item.produto_nome}
                    </p>

                    <p>
                      <strong>Total consumido no mês:</strong>{' '}
                      {formatNumber(item.total_consumido)}
                    </p>

                    <p>
                      <strong>Quantidade de retiradas:</strong>{' '}
                      {item.total_retiradas}
                    </p>
                  </article>
                ))
              ) : (
                <div className='auditoria__empty'>
                  Nenhum consumo registrado neste mês.
                </div>
              )}
            </div>

            <h3 className='auditoria__section-title'>Histórico de retiradas</h3>

            <div className='auditoria__cards'>
              {consumiveisFiltrados.length ? (
                consumiveisFiltrados.map((item) => (
                  <article
                    key={item.id}
                    className='auditoria__card'
                    onClick={() => abrirDetalheConsumivel(item)}
                  >
                    <h3>{item.produto_nome}</h3>

                    <p>
                      <strong>Funcionário:</strong> {item.funcionario_nome}
                    </p>

                    <p>
                      <strong>Setor:</strong> {item.setor || '-'}
                    </p>

                    <p>
                      <strong>Quantidade:</strong>{' '}
                      {formatNumber(item.quantidade)}
                    </p>

                    <p>
                      <strong>Data:</strong> {formatDate(item.criado_em)}
                    </p>
                  </article>
                ))
              ) : (
                <div className='auditoria__empty'>
                  Nenhuma retirada encontrada.
                </div>
              )}
            </div>
          </>
        )}

        {abaAtiva === 'entregas' && (
          <>
            <input
              className='auditoria__search'
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder='Buscar por entrega, cliente, produto, recebedor ou transportadora'
            />

            <div className='auditoria__indicadores'>
              <div className='auditoria__indicador-card'>
                <h3>Status das entregas</h3>
                {indicadoresEntregas.statusEntrega?.length ? (
                  indicadoresEntregas.statusEntrega.map((item) => (
                    <div key={item.status}>
                      {formatStatusEntrega(item.status)} -{' '}
                      <strong>{item.total}</strong>
                    </div>
                  ))
                ) : (
                  <div>Nenhum dado</div>
                )}
              </div>

              <div className='auditoria__indicador-card'>
                <h3>Entregas por tipo</h3>
                {indicadoresEntregas.porTipo?.length ? (
                  indicadoresEntregas.porTipo.map((item) => (
                    <div key={item.tipo}>
                      {formatStatusEntrega(item.tipo)} -{' '}
                      <strong>{item.total}</strong>
                    </div>
                  ))
                ) : (
                  <div>Nenhum dado</div>
                )}
              </div>

              <div className='auditoria__indicador-card'>
                <h3>Transportadoras mais usadas</h3>
                {indicadoresEntregas.transportadorasMaisUsadas?.length ? (
                  indicadoresEntregas.transportadorasMaisUsadas.map((item) => (
                    <div key={item.transportadora}>
                      {toTitleCase(item.transportadora)} -{' '}
                      <strong>{item.total}</strong>
                    </div>
                  ))
                ) : (
                  <div>Nenhum dado</div>
                )}
              </div>
            </div>

            <div className='auditoria__cards'>
              {entregasFiltradas.map((entrega) => (
                <article
                  key={entrega.id}
                  className='auditoria__card'
                  onClick={() => abrirDetalheEntrega(entrega)}
                >
                  <h3>Entrega #{entrega.id}</h3>
                  <p>
                    <strong>Cliente:</strong>{' '}
                    {toTitleCase(entrega.cliente_nome)}
                  </p>
                  <p>
                    <strong>Produto:</strong>{' '}
                    {toTitleCase(entrega.produto_nome)}
                  </p>
                  <p>
                    <strong>Quantidade:</strong> {entrega.quantidade}
                  </p>
                  <p>
                    <strong>Tipo:</strong> {formatStatusEntrega(entrega.tipo)}
                  </p>
                  <p>
                    <strong>Status:</strong>{' '}
                    {formatStatusEntrega(entrega.status)}
                  </p>
                  <p>
                    <strong>Quem retirou:</strong>{' '}
                    {toTitleCase(entrega.nome_recebedor)}
                  </p>
                  <p>
                    <strong>Transportadora:</strong>{' '}
                    {toTitleCase(
                      entrega.transportadora_nome ||
                        entrega.transportadora_nome_manual ||
                        '-',
                    )}
                  </p>
                  <p>
                    <strong>Placa:</strong>{' '}
                    {String(entrega.placa_veiculo || '-').toUpperCase()}
                  </p>
                  <p>
                    <strong>Criada em:</strong> {formatDate(entrega.criado_em)}
                  </p>
                  <p>
                    <strong>Entregue em:</strong>{' '}
                    {formatDate(entrega.entregue_em)}
                  </p>
                </article>
              ))}
            </div>
          </>
        )}
      </Card>

      {ordemSelecionada && (
        <div className='auditoria__modal'>
          <div
            className='auditoria__modal-backdrop'
            onClick={() => setOrdemSelecionada(null)}
          />

          <div className='auditoria__modal-card'>
            <h2>
              Auditoria da OP #{ordemSelecionada.id} -{' '}
              {ordemSelecionada.produto_nome}
            </h2>

            <div className='auditoria__timeline'>
              {detalhes.length ? (
                detalhes.map((relatorio) => (
                  <div key={relatorio.id} className='auditoria__timeline-card'>
                    <p>
                      <strong>Funcionário:</strong> {relatorio.nome_funcionario}
                    </p>
                    <p>
                      <strong>Data:</strong> {formatDate(relatorio.criado_em)}
                    </p>
                    <p>
                      <strong>Descrição:</strong> {relatorio.descricao}
                    </p>

                    {Array.isArray(relatorio.fotos) &&
                      relatorio.fotos.length > 0 && (
                        <div className='auditoria__fotos'>
                          {relatorio.fotos.map((foto) => (
                            <img
                              key={foto.id}
                              src={`${API_BASE}${foto.foto_url}`}
                              alt='Foto do relatório'
                              className='auditoria__foto'
                            />
                          ))}
                        </div>
                      )}
                  </div>
                ))
              ) : (
                <div>Nenhum relatório enviado ainda.</div>
              )}
            </div>

            <div className='auditoria__modal-actions'>
              <button
                type='button'
                className='btn btn--secondary'
                onClick={() => setOrdemSelecionada(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {entregaSelecionada && detalheEntrega && (
        <div className='auditoria__modal'>
          <div
            className='auditoria__modal-backdrop'
            onClick={() => {
              setEntregaSelecionada(null);
              setDetalheEntrega(null);
            }}
          />

          <div className='auditoria__modal-card'>
            <h2>Auditoria da Entrega #{detalheEntrega.id}</h2>

            <div className='auditoria__timeline-card'>
              <p>
                <strong>Cliente:</strong>{' '}
                {toTitleCase(detalheEntrega.cliente_nome)}
              </p>
              <p>
                <strong>Produto:</strong>{' '}
                {toTitleCase(detalheEntrega.produto_nome)}
              </p>
              <p>
                <strong>Quantidade:</strong> {detalheEntrega.quantidade}
              </p>
              <p>
                <strong>Status:</strong>{' '}
                {formatStatusEntrega(detalheEntrega.status)}
              </p>
              <p>
                <strong>Tipo:</strong>{' '}
                {formatStatusEntrega(detalheEntrega.tipo)}
              </p>
              <p>
                <strong>Transportadora:</strong>{' '}
                {toTitleCase(
                  detalheEntrega.transportadora_nome ||
                    detalheEntrega.transportadora_nome_manual ||
                    '-',
                )}
              </p>
              <p>
                <strong>Quem retirou / recebeu:</strong>{' '}
                {toTitleCase(detalheEntrega.nome_recebedor)}
              </p>
              <p>
                <strong>Documento:</strong>{' '}
                {detalheEntrega.documento_recebedor || '-'}
              </p>
              <p>
                <strong>Placa do veículo:</strong>{' '}
                {String(detalheEntrega.placa_veiculo || '-').toUpperCase()}
              </p>
              <p>
                <strong>Código de rastreio:</strong>{' '}
                {detalheEntrega.codigo_rastreio || '-'}
              </p>
              <p>
                <strong>Observações da saída:</strong>{' '}
                {detalheEntrega.observacoes_saida || '-'}
              </p>
              <p>
                <strong>Usuário que registrou:</strong>{' '}
                {toTitleCase(detalheEntrega.usuario_nome)}
              </p>
              <p>
                <strong>Prazo combinado:</strong>{' '}
                {formatDateOnly(detalheEntrega.prazo_entrega)}
              </p>
              <p>
                <strong>Criada em:</strong>{' '}
                {formatDate(detalheEntrega.criado_em)}
              </p>
              <p>
                <strong>Entregue em:</strong>{' '}
                {formatDate(detalheEntrega.entregue_em)}
              </p>

              {(detalheEntrega.foto_saida_url ||
                detalheEntrega.assinatura_saida_url) && (
                <div className='auditoria__fotos'>
                  {detalheEntrega.foto_saida_url ? (
                    <div className='auditoria__foto-box'>
                      <span className='auditoria__foto-label'>
                        Foto da saída
                      </span>
                      <img
                        src={`${API_BASE}${detalheEntrega.foto_saida_url}`}
                        alt='Foto da saída'
                        className='auditoria__foto'
                      />
                    </div>
                  ) : null}

                  {detalheEntrega.assinatura_saida_url ? (
                    <div className='auditoria__foto-box'>
                      <span className='auditoria__foto-label'>Assinatura</span>
                      <img
                        src={`${API_BASE}${detalheEntrega.assinatura_saida_url}`}
                        alt='Assinatura da saída'
                        className='auditoria__foto'
                      />
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className='auditoria__modal-actions'>
              <button
                type='button'
                className='btn btn--secondary'
                onClick={() => {
                  setEntregaSelecionada(null);
                  setDetalheEntrega(null);
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {consumivelSelecionado && detalheConsumivel && (
        <div className='auditoria__modal'>
          <div
            className='auditoria__modal-backdrop'
            onClick={() => {
              setConsumivelSelecionado(null);
              setDetalheConsumivel(null);
            }}
          />

          <div className='auditoria__modal-card'>
            <h2>Auditoria da retirada #{detalheConsumivel.id}</h2>

            {detalheConsumivel.alerta_consumo && (
              <div className='auditoria__alert-box'>
                Atenção: esta retirada ocorreu mais rápido que a média histórica
                deste funcionário para este consumível.
              </div>
            )}

            <div className='auditoria__timeline-card'>
              <p>
                <strong>Consumível:</strong> {detalheConsumivel.produto_nome}
              </p>

              <p>
                <strong>Funcionário:</strong>{' '}
                {detalheConsumivel.funcionario_nome}
              </p>

              <p>
                <strong>Setor:</strong> {detalheConsumivel.setor || '-'}
              </p>

              <p>
                <strong>Quantidade:</strong>{' '}
                {formatNumber(detalheConsumivel.quantidade)}
              </p>

              <p>
                <strong>Usuário que registrou:</strong>{' '}
                {detalheConsumivel.usuario_nome || '-'}
              </p>

              <p>
                <strong>Data da retirada:</strong>{' '}
                {formatDate(detalheConsumivel.criado_em)}
              </p>

              {detalheConsumivel.media_horas && (
                <p>
                  <strong>Média histórica:</strong>{' '}
                  {formatNumber(detalheConsumivel.media_horas)} horas
                </p>
              )}

              {detalheConsumivel.intervalo_horas && (
                <p>
                  <strong>Intervalo desde a última retirada:</strong>{' '}
                  {formatNumber(detalheConsumivel.intervalo_horas)} horas
                </p>
              )}

              {detalheConsumivel.justificativa && (
                <p>
                  <strong>Justificativa:</strong>{' '}
                  {detalheConsumivel.justificativa}
                </p>
              )}

              {(detalheConsumivel.foto_url ||
                detalheConsumivel.assinatura_url) && (
                <div className='auditoria__fotos'>
                  {detalheConsumivel.foto_url && (
                    <div className='auditoria__foto-box'>
                      <span className='auditoria__foto-label'>Foto</span>
                      <img
                        src={montarUrlArquivo(detalheConsumivel.foto_url)}
                        alt='Foto da retirada'
                        className='auditoria__foto'
                        onClick={() =>
                          setImagemPreview(
                            montarUrlArquivo(detalheConsumivel.foto_url),
                          )
                        }
                      />
                    </div>
                  )}

                  {detalheConsumivel.assinatura_url && (
                    <div className='auditoria__foto-box'>
                      <span className='auditoria__foto-label'>Assinatura</span>
                      <img
                        src={`${API_BASE}${detalheConsumivel.assinatura_url}`}
                        alt='Assinatura da retirada'
                        className='auditoria__foto'
                        onClick={() =>
                          setImagemPreview(
                            `${API_BASE}${detalheConsumivel.assinatura_url}`,
                          )
                        }
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className='auditoria__modal-actions'>
              <button
                type='button'
                className='btn btn--secondary'
                onClick={() => {
                  setConsumivelSelecionado(null);
                  setDetalheConsumivel(null);
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      {imagemPreview && (
        <div className='auditoria__image-preview'>
          <div
            className='auditoria__image-preview-backdrop'
            onClick={() => setImagemPreview(null)}
          />

          <div className='auditoria__image-preview-card'>
            <button
              type='button'
              className='auditoria__image-preview-close'
              onClick={() => setImagemPreview(null)}
            >
              ×
            </button>

            <img src={imagemPreview} alt='Pré-visualização' />
          </div>
        </div>
      )}
    </>
  );
}
