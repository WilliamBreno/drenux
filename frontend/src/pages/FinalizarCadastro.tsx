import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { verificarToken, verificarSessao } from '../api/planos';

const TENTATIVAS_MAX = 8; // ~16s de espera total, tempo do webhook processar
const INTERVALO_MS = 2000;

export function FinalizarCadastro() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [erro, setErro] = useState<string | null>(null);

  const token = searchParams.get('token');
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    let cancelado = false;

    async function irParaCadastro(email: string, plano: string, tokenFinal: string) {
      if (cancelado) return;
      navigate(
        `/cadastro?token_assinatura=${encodeURIComponent(tokenFinal)}&email=${encodeURIComponent(email)}&plano=${plano}`,
        { replace: true }
      );
    }

    async function viaToken(t: string) {
      try {
        const dados = await verificarToken(t);
        await irParaCadastro(dados.email, dados.plano, dados.token);
      } catch {
        if (!cancelado) setErro('Esse link já foi usado ou é inválido.');
      }
    }

    async function viaSessao(sid: string, tentativa = 1) {
      try {
        const dados = await verificarSessao(sid);
        await irParaCadastro(dados.email, dados.plano, dados.token);
      } catch {
        if (cancelado) return;
        if (tentativa < TENTATIVAS_MAX) {
          setTimeout(() => viaSessao(sid, tentativa + 1), INTERVALO_MS);
        } else {
          setErro('Confirmação demorou mais que o esperado. Verifique seu email — mandamos o link de finalização por lá também.');
        }
      }
    }

    if (token) {
      viaToken(token);
    } else if (sessionId) {
      viaSessao(sessionId);
    } else {
      setErro('Link incompleto.');
    }

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, sessionId]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-fundo px-4">
      <div className="w-full max-w-sm space-y-3 rounded-2xl bg-superficie p-8 text-center shadow-sm">
        {erro ? (
          <>
            <h1 className="font-display text-xl tracking-wide text-tinta">Ops</h1>
            <p className="text-sm text-tinta-suave">{erro}</p>
            <Link to="/" className="inline-block pt-2 text-sm font-medium text-acento">
              Voltar pra página de planos
            </Link>
          </>
        ) : (
          <>
            <h1 className="font-display text-xl tracking-wide text-tinta">Confirmando seu pagamento...</h1>
            <p className="text-sm text-tinta-suave">Isso leva só alguns segundos.</p>
          </>
        )}
      </div>
    </div>
  );
}