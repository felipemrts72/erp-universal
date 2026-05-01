import { useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/Card';
import DataTable from '../../components/DataTable';
import { useToast } from '../../contexts/ToastContext';
import './Usuarios.css';
import { toTitleCase } from '../../utils/formatText';

export default function Usuarios() {
  const { showToast } = useToast();

  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [role, setRole] = useState('');

  const [novaRole, setNovaRole] = useState('');

  const load = async () => {
    const [usuariosRes, rolesRes] = await Promise.all([
      api.get('/usuarios'),
      api.get('/roles'),
    ]);

    setUsuarios(usuariosRes.data || []);
    setRoles(rolesRes.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const criarUsuario = async () => {
    if (!nome || !email || !senha || !role) {
      showToast('Preencha todos os campos do usuário', 'warning');
      return;
    }

    await api.post('/usuarios', {
      nome,
      email,
      senha,
      role,
    });

    setNome('');
    setEmail('');
    setSenha('');
    setRole('');

    showToast('Usuário criado com sucesso', 'success');
    await load();
  };

  const criarRole = async () => {
    if (!novaRole.trim()) {
      showToast('Informe o nome da função', 'warning');
      return;
    }

    await api.post('/roles', {
      nome: novaRole,
    });

    setNovaRole('');
    showToast('Função criada com sucesso', 'success');
    await load();
  };

  return (
    <>
      <Card title='Usuários' subtitle='Cadastro de usuários do sistema'>
        <div className='usuarios-form'>
          <label>
            Nome
            <input value={nome} onChange={(e) => setNome(e.target.value)} />
          </label>

          <label>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>

          <label>
            Senha
            <input
              type='password'
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </label>

          <label>
            Função
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value=''>Selecione</option>
              {roles.map((item) => (
                <option key={item.id} value={item.nome}>
                  {toTitleCase(item.nome)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className='page-actions'>
          <button className='btn btn--primary' onClick={criarUsuario}>
            Criar usuário
          </button>
        </div>
      </Card>

      <Card title='Funções'>
        <div className='usuarios-role-form'>
          <label>
            Nova função
            <input
              value={novaRole}
              onChange={(e) => setNovaRole(e.target.value)}
              placeholder='Ex.: financeiro'
            />
          </label>

          <button className='btn btn--secondary' onClick={criarRole}>
            Criar função
          </button>
        </div>
      </Card>

      <Card title='Usuários cadastrados'>
        <DataTable
          columns={[
            { key: 'id', label: 'ID' },
            { key: 'nome', label: 'Nome' },
            { key: 'email', label: 'Email' },
            {
              key: 'role',
              label: 'Função',
              render: (_, row) => toTitleCase(row.role),
            },
          ]}
          rows={usuarios}
        />
      </Card>
    </>
  );
}
