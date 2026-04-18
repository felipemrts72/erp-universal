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

export default function AuditoriaProducao() {
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

  const [entregas, setEntregas] = useState([]);
  const [indicadoresEntregas, setIndicadoresEntregas] = useState({
    statusEntrega: [],
    porTipo: [],
    transportadorasMaisUsadas: [],
  });
  const [entregaSelecionada, setEntregaSelecionada] = useState(null);
  const [detalheEntrega, setDetalheEntrega] = useState(null);

  const load = async () => {
    try {
      setLoading(true);

      const [
        resumoProducaoRes,
        indicadoresProducaoRes,
        resumoEntregasRes,
        indicadoresEntregasRes,
      ] = await Promise.all([
        api.get('/auditoria-producao'),
        api.get('/auditoria-producao/indicadores'),
        api.get('/auditoria-entregas'),
        api.get('/auditoria-entregas/indicadores'),
      ]);

      setOrdens(
        Array.isArray(resumoProducaoRes.data) ? resumoProducaoRes.data : [],
      );
      setIndicadores(indicadoresProducaoRes.data || {});

      setEntregas(
        Array.isArray(resumoEntregasRes.data) ? resumoEntregasRes.data : [],
      );
      setIndicadoresEntregas(indicadoresEntregasRes.data || {});
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
      const { data } = await api.get(`/auditoria-producao/${ordem.id}`);
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

  const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api') //Por causa do MACOS
    .replace('/api', '');

  return (
    <>
      {loading && <LoadingModal />}

      <Card
        title='Auditoria'
        subtitle='Visão gerencial das ordens, relatórios e entregas.'
      >
        <div className='auditoria-producao__tabs'>
          <button
            type='button'
            className={`btn ${abaAtiva === 'producao' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setAbaAtiva('producao')}
          >
            Produção
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
              className='auditoria-producao__search'
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder='Buscar por OP, produto, cliente ou funcionário'
            />

            <div className='auditoria-producao__indicadores'>
              <div className='auditoria-producao__indicador-card'>
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

              <div className='auditoria-producao__indicador-card'>
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

              <div className='auditoria-producao__indicador-card'>
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

            <div className='auditoria-producao__cards'>
              {ordensFiltradas.map((ordem) => (
                <article
                  key={ordem.id}
                  className='auditoria-producao__card'
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

        {abaAtiva === 'entregas' && (
          <>
            <input
              className='auditoria-producao__search'
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder='Buscar por entrega, cliente, produto, recebedor ou transportadora'
            />

            <div className='auditoria-producao__indicadores'>
              <div className='auditoria-producao__indicador-card'>
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

              <div className='auditoria-producao__indicador-card'>
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

              <div className='auditoria-producao__indicador-card'>
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

            <div className='auditoria-producao__cards'>
              {entregasFiltradas.map((entrega) => (
                <article
                  key={entrega.id}
                  className='auditoria-producao__card'
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
        <div className='auditoria-producao__modal'>
          <div
            className='auditoria-producao__modal-backdrop'
            onClick={() => setOrdemSelecionada(null)}
          />

          <div className='auditoria-producao__modal-card'>
            <h2>
              Auditoria da OP #{ordemSelecionada.id} -{' '}
              {ordemSelecionada.produto_nome}
            </h2>

            <div className='auditoria-producao__timeline'>
              {detalhes.length ? (
                detalhes.map((relatorio) => (
                  <div
                    key={relatorio.id}
                    className='auditoria-producao__timeline-card'
                  >
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
                        <div className='auditoria-producao__fotos'>
                          {relatorio.fotos.map((foto) => (
                            <img
                              key={foto.id}
                              src={`${API_BASE}${foto.foto_url}`}
                              alt='Foto do relatório'
                              className='auditoria-producao__foto'
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

            <div className='auditoria-producao__modal-actions'>
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
        <div className='auditoria-producao__modal'>
          <div
            className='auditoria-producao__modal-backdrop'
            onClick={() => {
              setEntregaSelecionada(null);
              setDetalheEntrega(null);
            }}
          />

          <div className='auditoria-producao__modal-card'>
            <h2>Auditoria da Entrega #{detalheEntrega.id}</h2>

            <div className='auditoria-producao__timeline-card'>
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
                <div className='auditoria-producao__fotos'>
                  {detalheEntrega.foto_saida_url ? (
                    <div className='auditoria-producao__foto-box'>
                      <span className='auditoria-producao__foto-label'>
                        Foto da saída
                      </span>
                      <img
                        src={`${API_BASE}${detalheEntrega.foto_saida_url}`}
                        alt='Foto da saída'
                        className='auditoria-producao__foto'
                      />
                    </div>
                  ) : null}

                  {detalheEntrega.assinatura_saida_url ? (
                    <div className='auditoria-producao__foto-box'>
                      <span className='auditoria-producao__foto-label'>
                        Assinatura
                      </span>
                      <img
                        src={`${API_BASE}${detalheEntrega.assinatura_saida_url}`}
                        alt='Assinatura da saída'
                        className='auditoria-producao__foto'
                      />
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className='auditoria-producao__modal-actions'>
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
    </>
  );
}
