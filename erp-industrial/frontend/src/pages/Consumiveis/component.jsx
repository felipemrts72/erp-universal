import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/Card';
import DataTable from '../../components/DataTable';
import BuscaManual from '../../components/BuscaManual';
import { useToast } from '../../contexts/ToastContext';

// se você já tiver um componente pronto de assinatura, troque este import
import SignatureCanvas from 'react-signature-canvas';

import './style.css';

function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR');
}

export default function Consumiveis() {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);

  const [historico, setHistorico] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);

  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [funcionarioId, setFuncionarioId] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [foto, setFoto] = useState(null);

  const signatureRef = useRef(null);

  const funcionarioSelecionado = useMemo(() => {
    return (
      funcionarios.find((f) => String(f.id) === String(funcionarioId)) || null
    );
  }, [funcionarios, funcionarioId]);

  const load = async () => {
    try {
      setLoadingPage(true);

      const [historicoRes, funcionariosRes] = await Promise.all([
        api.get('/consumiveis'),
        api.get('/funcionarios'),
      ]);

      const historicoFormatado = (historicoRes.data || []).map((item) => ({
        ...item,
        criado_em_formatado: formatDate(item.criado_em),
      }));

      setHistorico(historicoFormatado);
      setFuncionarios(funcionariosRes.data || []);
    } catch (error) {
      showToast('Erro ao carregar consumíveis', 'error');
    } finally {
      setLoadingPage(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const limparFormulario = () => {
    setProdutoSelecionado(null);
    setFuncionarioId('');
    setQuantidade('');
    setFoto(null);

    if (signatureRef.current) {
      signatureRef.current.clear();
    }
  };

  const handleFotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setFoto(null);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFoto(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const getAssinaturaBase64 = () => {
    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      return '';
    }

    return signatureRef.current.getTrimmedCanvas().toDataURL('image/png');
  };

  const registrarSaida = async () => {
    try {
      if (!produtoSelecionado?.id) {
        showToast('Selecione um consumível', 'warning');
        return;
      }

      if (!funcionarioId) {
        showToast('Selecione um funcionário', 'warning');
        return;
      }

      if (!quantidade || Number(quantidade) <= 0) {
        showToast('Informe uma quantidade válida', 'warning');
        return;
      }

      const assinatura = getAssinaturaBase64();

      if (!assinatura) {
        showToast('A assinatura é obrigatória', 'warning');
        return;
      }

      setLoading(true);

      // ajuste aqui conforme você salva o usuário logado
      const usuarioSalvo = localStorage.getItem('user');
      const usuario = usuarioSalvo ? JSON.parse(usuarioSalvo) : null;

      if (!usuario?.id) {
        showToast('Usuário logado não encontrado', 'error');
        return;
      }

      await api.post('/consumiveis', {
        produto_id: produtoSelecionado.id,
        funcionario_id: Number(funcionarioId),
        usuario_id: Number(usuario.id),
        quantidade: Number(quantidade),
        assinatura,
        foto, // já vai preparado para futuro uso
      });

      showToast('Retirada registrada com sucesso', 'success');
      limparFormulario();
      await load();
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Erro ao registrar retirada';

      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card title='Retirada de consumíveis'>
        <div className='consumiveis-form'>
          <div className='consumiveis-form__group consumiveis-form__group--full'>
            <BuscaManual
              label='Consumível'
              placeholder='Digite o nome do consumível'
              endpoint='/produtos'
              searchKey='nome'
              minChars={2}
              onSelect={(item) => {
                if (item.tipo !== 'consumivel') {
                  showToast(
                    'Selecione um produto do tipo consumível',
                    'warning',
                  );
                  return;
                }

                setProdutoSelecionado(item);
              }}
            />
          </div>

          <div className='consumiveis-form__group consumiveis-form__group--full'>
            <label>Consumível selecionado</label>
            <input
              value={produtoSelecionado?.nome || ''}
              placeholder='Nenhum consumível selecionado'
              disabled
            />
          </div>

          <div className='consumiveis-form__group'>
            <label>Funcionário</label>
            <select
              value={funcionarioId}
              onChange={(e) => setFuncionarioId(e.target.value)}
              disabled={loading}
            >
              <option value=''>Selecione o funcionário</option>
              {funcionarios.map((funcionario) => (
                <option key={funcionario.id} value={funcionario.id}>
                  {funcionario.nome}
                </option>
              ))}
            </select>
          </div>

          <div className='consumiveis-form__group'>
            <label>Quantidade</label>
            <input
              type='number'
              min='1'
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              placeholder='Quantidade'
              disabled={loading}
            />
          </div>

          <div className='consumiveis-form__group consumiveis-form__group--full'>
            <label>Assinatura do funcionário</label>
            <div className='assinatura-wrapper'>
              <SignatureCanvas
                ref={signatureRef}
                penColor='black'
                canvasProps={{
                  className: 'assinatura-canvas',
                }}
              />
            </div>

            <div className='assinatura-actions'>
              <button
                type='button'
                className='btn'
                onClick={() => signatureRef.current?.clear()}
                disabled={loading}
              >
                Limpar assinatura
              </button>
            </div>
          </div>

          <div className='consumiveis-form__group consumiveis-form__group--full'>
            <label>Foto da retirada (opcional, futuro uso)</label>
            <input
              type='file'
              accept='image/*'
              onChange={handleFotoChange}
              disabled={loading}
            />
          </div>

          <div className='consumiveis-form__actions'>
            <button
              className='btn btn--primary consumiveis-form__submit'
              onClick={registrarSaida}
              disabled={loading}
            >
              {loading ? 'Registrando...' : 'Registrar retirada'}
            </button>

            <button
              type='button'
              className='btn'
              onClick={limparFormulario}
              disabled={loading}
            >
              Limpar
            </button>
          </div>
        </div>
      </Card>

      <Card title='Últimas retiradas'>
        <DataTable
          columns={[
            { key: 'produto_nome', label: 'Consumível' },
            { key: 'funcionario_nome', label: 'Funcionário' },
            { key: 'quantidade', label: 'Quantidade' },
            { key: 'criado_em_formatado', label: 'Data' },
          ]}
          rows={historico}
          loading={loadingPage}
        />
      </Card>
    </>
  );
}
