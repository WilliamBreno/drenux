import { Link } from 'react-router-dom';

// Pilha de pastas: cada pasta é um capítulo da página, com a cor chapada
// que aquele capítulo vai ter lá embaixo. A pasta da frente "escorre" pra
// fora da tela e vira o primeiro campo de Vantagens (mesma cor, sem
// emenda), então o hero já mostra o mapa da página inteira.
const PASTAS = [
  { rotulo: 'Perguntas', alvo: '#perguntas', cor: 'var(--l-hortela)', tinta: 'var(--l-tinta)', aba: { desk: '78%', mob: '0%' } },
  { rotulo: 'Planos', alvo: '#planos', cor: 'var(--l-amarelo)', tinta: 'var(--l-tinta)', aba: { desk: '59%', mob: 'calc(100% - 132px)' } },
  { rotulo: 'Como funciona', alvo: '#como-funciona', cor: 'var(--l-oceano)', tinta: 'var(--l-papel)', aba: { desk: '40%', mob: 'calc(50% - 66px)' } },
  { rotulo: 'Temas', alvo: '#temas', cor: 'var(--l-preto-2)', tinta: 'var(--l-papel)', aba: { desk: '21%', mob: '0%' } },
  { rotulo: 'Vantagens', alvo: '#vantagens', cor: 'var(--l-rosa)', tinta: 'var(--l-papel)', aba: { desk: '2%', mob: 'calc(100% - 132px)' } },
];

export function Hero() {
  return (
    <section className="relative flex min-h-[100svh] flex-col overflow-hidden bg-[var(--l-preto)] text-[var(--l-papel)]">
      <nav className="l-margem relative z-10 grid grid-cols-3 items-center pt-6" aria-label="Principal">
        <a href="#planos" className="l-link hidden justify-self-start text-[15px] md:inline">
          Planos
        </a>
        <Link
          to="/"
          className="col-start-2 justify-self-center text-[22px] font-medium tracking-[0.18em] text-[var(--l-ouro)]"
          aria-label="Drenux, página inicial"
        >
          DRENUX
        </Link>
        <Link to="/login" className="l-link justify-self-end text-[15px]">
          Entrar
        </Link>
      </nav>

      <div className="l-margem flex flex-col items-center pt-[clamp(56px,9vh,96px)] text-center">
        <h1 className="l-revela text-[clamp(4.25rem,15vw,10rem)] font-medium leading-[0.9] tracking-[-0.05em] md:text-[clamp(6rem,10.5vw,10rem)]">
          Venda direto
        </h1>
        <p
          className="l-revela mt-6 max-w-[46ch] text-[16px] leading-snug text-[var(--l-papel)] md:text-[20px]"
          style={{ ['--l-ordem' as string]: 1 }}
        >
          Cardápio digital e loja online: o cliente pede pelo seu link, paga no Pix e é avisado no WhatsApp. Sem app
          no meio cobrando comissão.
        </p>
      </div>

      {/* Pilha. Ocupa o resto da tela; cada pasta desce 64px (52px no
          celular) em relação à de trás. */}
      <div className="relative mt-auto h-[46svh] min-h-[330px] md:h-[47svh]">
        {PASTAS.map((p, i) => {
          const frente = i === PASTAS.length - 1;
          return (
            <div
              key={p.rotulo}
              className="l-pasta"
              style={{
                top: `calc(40px + ${i} * var(--l-passo-pasta))`,
                background: p.cor,
                color: p.tinta,
              }}
            >
              <a
                href={p.alvo}
                className="l-pasta__aba l-aba-desk"
                style={{ left: p.aba.desk, background: p.cor, color: p.tinta }}
              >
                {p.rotulo}
              </a>
              <a
                href={p.alvo}
                className="l-pasta__aba l-aba-mob"
                style={{ left: p.aba.mob, background: p.cor, color: p.tinta }}
              >
                {p.rotulo}
              </a>
              {frente && (
                <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:gap-8 md:p-8">
                  <Link to="/cadastro" className="l-botao l-botao--ouro w-full md:w-auto">
                    Criar loja grátis
                  </Link>
                  <p className="text-[16px] leading-snug md:text-[17px]">
                    Grátis pra começar: sem mensalidade, sem cartão, pronto em minutos.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
