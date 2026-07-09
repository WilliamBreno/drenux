import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { cadastrar } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { Campo } from '../components/Campo';

export function Cadastro() {
  const navigate = useNavigate();
  const setToken = useAuthStore((state) => state.setToken);
  const [searchParams] = useSearchParams();
  const codigoAfiliado = searchParams.get('ref') || undefined;

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nomeLoja, setNomeLoja] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function criarConta(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      const { token } = await cadastrar({
        nome,
        email,
        senha,
        nome_loja: nomeLoja,
        codigo_afiliado: codigoAfiliado,
      });
      setToken(token);
      navigate('/admin');
    } catch {
      setErro('Não foi possível criar a conta. Esse email já pode estar em uso.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-fundo px-4 py-10">
      <form
        onSubmit={criarConta}
        className="w-full max-w-sm space-y-5 rounded-2xl bg-superficie p-8 shadow-sm"
      >
        <div className="text-center">
          <h1 className="font-display text-2xl tracking-wide text-tinta">Crie sua loja</h1>
          <p className="mt-1 text-sm text-tinta-suave">Seu cardápio online em poucos minutos</p>
        </div>

        <Campo label="Seu nome">
          <input
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full rounded-lg border border-tinta/20 bg-fundo px-3 py-2 text-tinta outline-none focus:border-acento"
          />
        </Campo>

        <Campo label="Nome da loja">
          <input
            required
            value={nomeLoja}
            onChange={(e) => setNomeLoja(e.target.value)}
            placeholder="Padaria da Maria"
            className="w-full rounded-lg border border-tinta/20 bg-fundo px-3 py-2 text-tinta outline-none focus:border-acento"
          />
        </Campo>

        <Campo label="Email">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-tinta/20 bg-fundo px-3 py-2 text-tinta outline-none focus:border-acento"
          />
        </Campo>

        <Campo label="Senha">
          <input
            type="password"
            required
            minLength={6}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full rounded-lg border border-tinta/20 bg-fundo px-3 py-2 text-tinta outline-none focus:border-acento"
          />
        </Campo>

        {erro && <p className="text-sm text-acento">{erro}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-full bg-acento py-3 font-semibold text-superficie transition disabled:opacity-60"
        >
          {enviando ? 'Criando...' : 'Criar minha loja'}
        </button>

        <p className="text-center text-sm text-tinta-suave">
          Já tem conta?{' '}
          <Link to="/login" className="font-medium text-acento">
            Entrar
          </Link>
        </p>
      </form>
    </div>
  );
}