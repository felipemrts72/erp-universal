import { useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/Card';
import DataTable from '../../components/DataTable';
import BuscaManual from '../../components/BuscaManual';
import { useToast } from '../../contexts/ToastContext';

import './style.css';

export default function Funcionarios() {
  const { showToast } = useToast();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    email: '',
    setor: '',
    salario: '',
    insalubridade: '',
  });
  const [selectedId, setSelectedId] = useState(null);

  const load = async () => {
    const { data } = await api.get('/funcionarios');
    setItems(data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const resetFormulario = () => {
    setForm({
      nome: '',
      cpf: '',
      telefone: '',
      email: '',
      setor: '',
      salario: '',
      insalubridade: '',
    });
    setSelectedId(null);
  };

  const save = async () => {
    try {
      if (selectedId) {
        await api.patch(`/funcionarios/${selectedId}`, form);
        showToast('Funcionário atualizado', 'success');
      } else {
        await api.post('/funcionarios', form);
        showToast('Funcionário criado', 'success');
      }

      resetFormulario();
      await load();
    } catch (err) {
      showToast(
        err?.response?.data?.message || 'Erro ao salvar funcionário',
        'error',
      );
    }
  };

  return (
    <>
      <Card title='Cadastro de funcionários'>
        <BuscaManual
          endpoint='/funcionarios/busca'
          label='Buscar funcionário para edição'
          placeholder='Digite nome, CPF, telefone, e-mail ou setor'
          onSelect={(id, item) => {
            setSelectedId(id);
            setForm({
              nome: item.nome || '',
              cpf: item.cpf || '',
              telefone: item.telefone || '',
              email: item.email || '',
              setor: item.setor || '',
              salario: item.salario || '',
              insalubridade: item.insalubridade || '',
            });
          }}
        />
        <div className='form-grid'>
          <label className='form-control'>
            Nome
            <input
              value={form.nome}
              onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
            />
          </label>
          <label className='form-control'>
            CPF
            <input
              value={form.cpf}
              onChange={(e) => setForm((p) => ({ ...p, cpf: e.target.value }))}
            />
          </label>
          <label className='form-control'>
            Telefone
            <input
              value={form.telefone}
              onChange={(e) =>
                setForm((p) => ({ ...p, telefone: e.target.value }))
              }
            />
          </label>
          <label className='form-control'>
            E-mail
            <input
              value={form.email}
              onChange={(e) =>
                setForm((p) => ({ ...p, email: e.target.value }))
              }
            />
          </label>

          <label className='form-control'>
            Setor
            <input
              value={form.setor}
              onChange={(e) =>
                setForm((p) => ({ ...p, setor: e.target.value }))
              }
            />
          </label>
          <label className='form-control'>
            Salário
            <input
              value={form.salario}
              onChange={(e) =>
                setForm((p) => ({ ...p, salario: e.target.value }))
              }
              placeholder='Ex: 2500'
            />
          </label>

          <label className='form-control'>
            Insalubridade (%)
            <input
              value={form.insalubridade}
              onChange={(e) =>
                setForm((p) => ({ ...p, insalubridade: e.target.value }))
              }
              placeholder='Ex: 20'
            />
          </label>
        </div>
        <div className='page-actions'>
          <button className='btn btn--primary' onClick={save}>
            {selectedId ? 'Salvar edição' : 'Criar funcionário'}
          </button>
        </div>
      </Card>
      <Card title='Listagem'>
        <DataTable
          columns={[
            { key: 'id', label: 'ID' },
            { key: 'nome', label: 'Nome' },
            { key: 'cpf', label: 'CPF' },
            { key: 'setor', label: 'Setor' },
            { key: 'salario', label: 'Salário' },
          ]}
          rows={items}
        />
      </Card>
    </>
  );
}
