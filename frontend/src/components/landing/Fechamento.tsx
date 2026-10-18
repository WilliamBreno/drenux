import { Link } from 'react-router-dom';
import { CREDITOS_FOTOS } from './dados';

const ATALHOS = [
  { rotulo: 'Vantagens', alvo: '#vantagens' },
  { rotulo: 'Temas', alvo: '#temas' },
  { rotulo: 'Como funciona', alvo: '#como-funciona' },
  { rotulo: 'Planos', alvo: '#planos' },
  { rotulo: 'Perguntas', alvo: '#perguntas' },
];

// Chamada final (cores invertidas, volta ao preto do começo) + rodapé com
// o nome da marca ocupando a largura toda.
export function Fechamento() {
  return (
    <>
      <section
        aria-label="Comece agora"
        className="l-margem flex min-h-[80svh] flex-col justify-between bg-[var(--l-preto)] pb-10 pt-20 text-[var(--l-papel)] md:min-h-[90svh] md:pt-28"
      >
        <h2 className="l-revela max-w-[11ch] text-[clamp(3.5rem,15vw,10rem)] font-medium leading-[0.9] tracking-[-0.05em] md:text-[clamp(4rem,10vw,10rem)]">
          Comece a vender direto
        </h2>
        <div className="mt-16 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <p className="l-revela max-w-[40ch] text-[17px] leading-snug md:text-[20px]" style={{ ['--l-ordem' as string]: 1 }}>
            Monte o cardápio hoje, de graça. Quando quiser Pix automático, ative o Basic, também sem mensalidade.
          </p>
          <Link
            to="/cadastro"
            className="l-revela l-botao l-botao--ouro w-full md:w-auto"
            style={{ ['--l-ordem' as string]: 2 }}
          >
            Criar loja grátis
          </Link>
        </div>
      </section>

      <footer className="l-margem overflow-hidden bg-[var(--l-preto)] pb-8 pt-24 text-[var(--l-papel)] md:pt-40">
        <p
          aria-hidden
          className="select-none whitespace-nowrap text-center text-[25.5vw] font-medium leading-[0.8] tracking-[-0.06em] text-[var(--l-ouro)]"
        >
          DRENUX
        </p>

        <div className="mt-16 grid grid-cols-12 gap-y-10 md:mt-[72px]">
          <ul className="col-span-12 space-y-1 md:col-span-5">
            <li>
              <Link to="/cadastro" className="l-link text-[26px] text-[var(--l-ouro)] md:text-[34px]">
                Criar loja grátis
              </Link>
            </li>
            <li>
              <Link to="/login" className="l-link text-[26px] text-[var(--l-ouro)] md:text-[34px]">
                Entrar no painel
              </Link>
            </li>
            <li>
              <Link to="/afiliado/login" className="l-link text-[26px] text-[var(--l-ouro)] md:text-[34px]">
                Área do afiliado
              </Link>
            </li>
          </ul>
          <ul className="col-span-6 space-y-2 text-[15px] md:col-span-2 md:col-start-7">
            {ATALHOS.map((a) => (
              <li key={a.alvo}>
                <a href={a.alvo} className="l-link">
                  {a.rotulo}
                </a>
              </li>
            ))}
          </ul>
          <p className="col-span-12 text-[14px] leading-relaxed md:col-span-4 md:col-start-9">
            As lojas da página são exemplos fictícios. Fotos de acervo aberto:{' '}
            {CREDITOS_FOTOS.map((c, i) => (
              <span key={c.url}>
                <a href={c.url} target="_blank" rel="noreferrer" className="l-link">
                  {c.titulo}
                </a>
                , {c.autor} ({c.licenca}){i < CREDITOS_FOTOS.length - 1 ? '; ' : '.'}
              </span>
            ))}
          </p>
        </div>

        <div className="mt-20 flex items-center justify-between text-[13px] md:mt-24">
          <span>© {new Date().getFullYear()} Drenux</span>
          <a href="#topo" className="l-link">
            Voltar ao topo
          </a>
        </div>
      </footer>
    </>
  );
}
