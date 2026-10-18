import { Link } from 'react-router-dom';
import '../components/landing/landing.css';
import { CREDITOS_FOTOS } from '../components/landing/dados';

// Atribuição exigida pelas licenças CC BY / CC BY-SA das fotos usadas na
// landing (lojas de exemplo). Fica numa página à parte pra não pesar no
// rodapé, mas precisa continuar acessível por link público.
export function CreditosImagens() {
  return (
    <div className="drx-l min-h-[100svh] text-[var(--l-papel)]">
      <div className="l-margem mx-auto max-w-3xl py-16 md:py-24">
        <Link to="/" className="l-link text-[15px]">
          Voltar para a página inicial
        </Link>
        <h1 className="mt-10 text-[clamp(2.5rem,6vw,4rem)] font-medium leading-[0.95] tracking-[-0.04em]">
          Créditos das imagens
        </h1>
        <p className="mt-5 max-w-[56ch] text-[17px] leading-relaxed">
          As lojas, produtos e preços mostrados na página inicial são exemplos. As fotos vêm de acervos abertos e
          são usadas conforme a licença de cada uma.
        </p>
        <ul className="mt-10 space-y-4 text-[17px]">
          {CREDITOS_FOTOS.map((c) => (
            <li key={c.url}>
              <a href={c.url} target="_blank" rel="noreferrer" className="l-link">
                {c.titulo}
              </a>
              , por {c.autor} ({c.licenca})
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
