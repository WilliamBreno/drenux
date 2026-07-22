# Plano de melhorias — Drenux

> Este arquivo documenta o roadmap combinado numa conversa com o Claude (chat) em julho/2026.
> Ele existe pra você (Claude Code) saber exatamente o que fazer quando o William disser algo como
> **"Pode atualizar"**, sem precisar que ele reexplique o contexto a cada sessão.

## Instruções de execução

Quando o William pedir pra seguir o plano ("pode atualizar", "bora pra próxima fase", etc.):

1. Releia este arquivo do início. Ache a primeira fase com status `[ ] pendente`.
2. Implemente **só essa fase** — não pule fases, não faça mais de uma por vez, a menos que ele peça
   explicitamente.
3. Depois de implementar, valide antes de dizer que terminou:
   - Backend: `cd backend && go build ./...` (e `go vet ./...` se der tempo)
   - Frontend: `cd frontend && npx tsc -b` (typecheck) — o build completo (`npm run build`) se quiser
     ir além
4. Corrija qualquer erro que aparecer antes de considerar a fase concluída.
5. Marque a fase como `[x] concluída` neste arquivo (edite o status abaixo) e resuma pro William, em
   poucas linhas, o que mudou e em quais arquivos.
6. Pare e espere ele revisar antes de seguir pra próxima fase, a menos que ele quando peça
   explicitamente pra fazer tudo de uma vez.

Se qualquer instrução deste arquivo conflitar com o que o William pedir na hora, o pedido dele na
hora vale mais — este arquivo é o plano combinado, não uma trava.

## Contexto do produto

Drenux (antigo nome: Brenvo/Cardápio Site) é um SaaS multi-tenant de cardápio/loja online com
pagamento integrado. Atende dois perfis de loja: **alimentício** (comida/bebida) e **mercadoria**
(produtos não perecíveis, ex: roupas, artesanato). Monetização por assinatura (planos Start/Pro/Scale,
ver `MeuPlano.tsx`) combinada com a taxa por pedido, que varia por plano.

**Processador de pagamento em migração: Stripe Connect → Asaas.** Ainda nenhuma empresa real está
cadastrada em produção, então a troca está sendo feita antes do lançamento real — motivo principal é o
Pix (na Stripe, hoje só disponível por convite pra empresas brasileiras) e taxas menores. Decisão já
fechada: taxa do Start passa a 6,5% + piso de R$2,50/pedido (Drenux absorve a taxa do Asaas, afiliado
recebe 30% do lucro líquido); Pro (R$129/mês+4%) e Scale (R$349/mês+1,5%) mantêm os mesmos números,
só que agora é a loja quem absorve a taxa do Asaas (como já absorvia a do Stripe), afiliado continua
com ~37,6% da comissão bruta. Ou seja: troca o processador por trás, a lógica de quem paga a taxa em
cada plano não muda. Enquanto esse trabalho não estiver concluído, qualquer código novo que mexer com
onboarding/repasse de pagamento deve considerar que a integração-alvo é a API do Asaas, não a Stripe
Connect — confirme com o William antes de escrever código específico de Stripe Connect nessa área.

Stack: backend Go (Gin/GORM/PostgreSQL) em `backend/`, frontend React 19 + TypeScript + Vite +
Tailwind v3 + TanStack Query + Zustand em `frontend/`.

## Bibliotecas de UI — onde usar cada uma

| Área | Biblioteca | Observação |
|---|---|---|
| Painel Admin (formulários, tabelas, dialogs) | **shadcn/ui** | Já instalado (`components.json`, style `base-nova`). Base de tudo. |
| Fluxos novos de cadastro em massa / variações | shadcn + **21st.dev** | 21st.dev não é dependência — é diretório de blocos prontos pra copiar (formulário multi-step, data table). |
| Meu Plano (cards de plano, alerta de upgrade) | 21st.dev (layout) + **Magic UI** (destaque) | Já em uso: `ShimmerButton`, `NumberTicker` em `Planos.tsx` e `MeuPlano.tsx`. |
| Cardápio público (cliente final) | **Magic UI** como padrão | React Bits só como reserva pontual — não instalar como base pra não duplicar dependência de animação com a Magic UI. |

## Fases

### Fase 1 — Tipo de loja (`SegmentoPrincipal`)
Status: `[x] concluída` (23/07/2026) — código já existia pronto no working tree local (não
commitado), por isso não aparecia em produção no teste do William em 22/07/2026. Revisado arquivo a
arquivo em 23/07/2026: todos os itens do backend e do frontend listados abaixo já estavam
implementados corretamente, incluindo o bug do `CodigoAfiliado`/`TokenAssinatura` não repassado.
Validado com `go build ./...`, `go vet ./...` e `npx tsc -b` — sem erros. **Falta só o William
commitar/dar push pra ir pro ar** (commits são responsabilidade dele, não do Claude Code).

**Rótulo pro lojista (confirmado com o William em 23/07/2026):** "O que sua loja vende
principalmente?" com botões "Comida e bebida" / "Outros produtos" — ajustado em `Cadastro.tsx` e
`Configuracoes.tsx` (estava "Mercadoria" antes da confirmação).

Objetivo: cada loja declara se vende principalmente produtos **alimentícios** ou **mercadoria**
(reaproveitando o enum `TipoProduto` que já existe em `domain.Produto` — não criar um vocabulário
novo). Isso: (1) define o tipo padrão de produtos novos, (2) mais pra frente vai alimentar a categoria
de negócio sugerida no onboarding da loja no processador de pagamento (hoje em migração de Stripe
Connect pra Asaas — ver seção "Contexto do produto" acima; não amarrar essa lógica a campos
específicos da API da Stripe), (3) decide qual fluxo de catálogo mostrar nas Fases 2/3.

**Backend:**
- `domain/loja.go` — campo novo `SegmentoPrincipal TipoProduto` (gorm `default:'alimenticio'`,
  json `segmento_principal`). Migra sozinho via `AutoMigrate`, sem SQL manual.
- `handler/auth_handler.go` — `cadastroRequest` ganha `SegmentoPrincipal string` (`binding:"required,oneof=alimenticio mercadoria"`), repassado pro `CadastroInput`.
  - **Bug pra corrigir de quebra**: `CodigoAfiliado` e `TokenAssinatura` chegam no JSON do
    `cadastroRequest` mas hoje **não são repassados** pro `service.CadastroInput` na chamada de
    `Cadastrar()` — atribuição de afiliado e finalização de assinatura paga no cadastro estão
    quebradas silenciosamente. Adicionar os dois campos na struct e na chamada.
- `service/auth_service.go` — `CadastroInput` ganha `SegmentoPrincipal string`; usar na criação da
  `domain.Loja{}`; criar helper `categoriasPadrao(segmento, lojaID)` que devolve categorias diferentes
  por segmento (ex: alimentício → "Salgados"/"Doces"; mercadoria → "Mais vendidos"/"Novidades") em vez
  do slice fixo atual.
- `handler/loja_handler.go` + `repository/loja_repository.go` — `SegmentoPrincipal` também editável
  depois via `PUT /admin/loja` (mesmo padrão do campo `AceitaGuardarEntregar`, que já existe e serve
  de referência de como um campo de configuração é adicionado ponta a ponta).

**Frontend:**
- `api/types.ts`, `api/auth.ts`, `api/admin.ts` — adicionar `segmento_principal: 'alimenticio' | 'mercadoria'`.
- `pages/Cadastro.tsx` — seletor visual (dois botões) pra escolher o segmento no cadastro, obrigatório.
- `pages/admin/Configuracoes.tsx` — mesmo seletor, editável depois (mesmo padrão visual do bloco
  "Guardar e entregar depois" que já existe nesse arquivo).
- `pages/admin/Produtos.tsx` — buscar a `loja` (`useQuery(['loja'], buscarLoja)`) e usar
  `loja?.segmento_principal` como valor inicial do campo `tipo_produto` ao abrir "novo produto".

**Bug bônus pra corrigir (achado à parte, sem relação com a fase, mas trava build em clone novo):**
Se existir uma pasta literal `frontend/@/lib/utils.ts`, é o `lib/utils.ts` do shadcn no lugar errado
(deveria ser `frontend/src/lib/utils.ts` — confere o alias `@` em `vite.config.ts` e `tsconfig.app.json`,
os dois já apontam pra `src/`). Mover pro lugar certo com `git mv` e apagar a pasta `@` vazia.

### Fase 2 — Variações de produto
Status: `[x] concluída` (23/07/2026) — implementado do zero (não havia trabalho prévio no working
tree, diferente da Fase 1). Validado com `go build ./...`, `go vet ./...` e `npx tsc -b` — sem
erros. Falta o William commitar/dar push.

**O que foi feito:**
- `domain.VariacaoProduto` ganhou `MostrarValorAdicional bool` (default true, preserva
  comportamento atual) e `ModoPreco` (`aditivo` default | `absoluto`, tipo novo
  `ModoPrecoVariacao`, mesmo padrão de enum do `TipoProduto`).
- Tabela nova `FotoVariacao` (`domain/foto_variacao.go`), migrada via `AutoMigrate`, com
  repositório (`foto_variacao_repository.go`), handler (`FotoVariacaoHandler` em
  `variacao_handler.go`, valida a cadeia loja→produto→variação) e rotas
  `POST/DELETE /admin/variacoes/:produtoId/:variacaoId/fotos(/:fotoId)`.
- `produto_repository.go` e `variacao_repository.go` agora fazem preload de `Variacoes.Fotos`.
- `pedido_service.go`: cálculo de preço do item corrigido — no modo `absoluto`,
  `precoUnit = variacao.PrecoAdicional` (não soma mais ao preço base); no `aditivo` continua como
  antes. Esse é o ponto que efetivamente cobra o cliente — os cálculos no frontend são só exibição.
- Frontend: `types.ts`/`admin.ts` com os campos novos e funções `adicionarFotoVariacao`/
  `deletarFotoVariacao`; helper `precoItem()` novo em `lib/utils.ts` centraliza a regra
  aditivo/absoluto, usado em `ProdutoCard.tsx`, `cartStore.ts` e `CarrinhoDrawer.tsx` (antes cada
  um recalculava na mão). `ProdutoCard.tsx` também troca a galeria de fotos pra da variação
  selecionada quando ela tiver fotos próprias.
- `pages/admin/Produtos.tsx`: formulário de variação ganhou seletor de modo de preço (com padrão
  sugerido pelo `segmento_principal` da loja — mercadoria abre em "absoluto"), toggle de
  visibilidade do valor, e upload de fotos da variação (só aparece editando uma variação existente
  em modo absoluto, mesmo padrão de fluxo das fotos de produto).

Objetivo: dois ajustes no sistema de variações (`domain.VariacaoProduto`), que hoje só tem
`PrecoAdicional` (valor somado ao preço base) e nenhuma foto própria:

1. **Toggle de visibilidade do valor adicional** — campo novo (ex: `MostrarValorAdicional bool`) pra
   decidir se o preço extra da variação aparece pro cliente no cardápio público ou fica escondido.
2. **Modo de variação com preço/foto próprios** — pensado pro segmento "mercadoria" (ex: um tênis
   branco Nike com 3 modelos diferentes, cada um com preço absoluto e fotos próprias, em vez de um
   acréscimo sobre o preço base). Precisa de: campo indicando se a variação é aditiva ou de preço
   absoluto, e uma tabela `FotoVariacao` nova (hoje `FotoProduto` só se relaciona com `Produto`).

O modo disponível (aditivo vs. absoluto+foto) deve ser sugerido conforme o `SegmentoPrincipal` da loja
(Fase 1) — alimentício vê o modo aditivo por padrão, mercadoria vê o modo de preço/foto próprios.

### Fase 3 — Cadastro de catálogo em massa
Status: `[x] concluída` (23/07/2026) — implementado como modal multi-step (opção escolhida pelo
William entre duas propostas), testado de ponta a ponta num ambiente local real (Postgres via
Docker + backend Go + frontend Vite, loja de teste criada pelo fluxo de cadastro de verdade) usando
Playwright, não só `tsc -b`. Falta o William commitar/dar push.

**Achado importante durante o teste (fora do escopo da fase, corrigido por bloquear tudo):** o
`npm run build`/`npm run dev` estavam **completamente quebrados** antes desta sessão — `frontend/src/index.css`
usa sintaxe do Tailwind v4 (`@theme inline`, `@apply border-border`, `@import "shadcn/tailwind.css"`
com `@utility`/`--spacing()`), mas o projeto está no Tailwind v3.4.19, que não entende nada disso.
Isso não é coisa nova da Fase 3 — já quebrava `MeuPlano.tsx` e `Planos.tsx`, que também usam esses
tokens (`bg-muted`, `ring-primary` etc.). Corrigido com um mapeamento padrão desses tokens semânticos
pra `tailwind.config.js` (usando `oklch(from var(--x) l c h / <alpha-value>)` pra manter suporte a
modificador de opacidade tipo `ring-ring/50`), sem tocar nas variáveis de tema em `index.css`.

**Correção 23/07/2026 (Fase 4): o `npm run build` ainda estava quebrado depois disso** — só tinha
sido testado com `npm run dev`, que não roda a etapa de minificação. `components/ui/card.tsx`,
`accordion.tsx` e `shimmer-button.tsx` usavam mais sintaxe exclusiva do Tailwind v4
(`gap-(--card-spacing)`, `[--card-spacing:--spacing(4)]`, `h-(--accordion-panel-height)`,
`inset-(--cut)`) que quebrava a minificação (`lightningcss`) mesmo com o Tailwind/PostCSS passando.
Reescrito pra sintaxe v3 equivalente (`gap-[var(--card-spacing)]`, `[--card-spacing:1rem]` etc.),
sem mudar nada visualmente — `Card` só é usado em `MeuPlano.tsx`/`Planos.tsx` e nenhum lugar usa a
prop `size="sm"`, então simplificar pra valor fixo foi seguro. **Agora `npm run build` passa de
verdade** (só restam avisos inofensivos de "unknown at-rule" pros blocos `scroll-fade`/`shimmer-*`
ainda não usados no app, que não geram erro). Antes dessa correção, **o deploy de produção mais
recente (se feito depois do commit "Implementação do Meu Plano") provavelmente falhou ou está
servindo build antigo** — vale conferir o histórico de deploys no Vercel.

**O que foi feito:**
- `frontend/src/components/ui/dialog.tsx` — componente Dialog do shadcn (faltava; puxado via CLI,
  que de novo gerou a pasta `@/` errada por causa do mesmo bug de alias da Fase 1 — movido na mão
  pro lugar certo, pasta `@/` removida de novo).
- `frontend/src/components/admin/ProdutoFormFields.tsx` e `VariacaoFormFields.tsx` — campos dos
  formulários de produto e variação extraídos dos dois lugares que já existiam (form inline de
  criar/editar produto, form inline de variação em `Produtos.tsx`) pra um componente compartilhado,
  já que agora são usados também pelo wizard — evita duplicar a mesma lógica em três lugares.
- `frontend/src/components/admin/CadastroEmMassaDialog.tsx` — o wizard: etapa 1 (dados do produto,
  igual ao form existente) → etapa 2 (variações do produto recém-criado, opcional, com upload de
  foto por variação no modo absoluto) → "+ Adicionar outro produto" (volta pra etapa 1 com formulário
  limpo, contador incrementa) ou "Concluir" (fecha).
- `pages/admin/Produtos.tsx` — botão "Cadastro em massa" ao lado de "+ Novo produto"; refatorado pra
  usar os dois componentes de formulário extraídos (comportamento idêntico ao anterior).
- Backend: nenhuma rota nova — o wizard reusa `POST /admin/produtos`, `POST /admin/variacoes/:produtoId`
  e as rotas de foto de variação da Fase 2.

**Nota de acessibilidade (menor, não bloqueia, não é da Fase 3):** o componente `Campo` embrulha os
filhos num `<label>`; em campos com dois botões de escolha (ex: "Modo de preço" aqui, e o seletor de
segmento da Fase 1 em `Cadastro.tsx`/`Configuracoes.tsx`), isso faz o navegador calcular o "nome
acessível" dos botões errado (mistura o texto dos dois) — não afeta clique de mouse/touch, só leitores
de tela. Achado ao automatizar o teste com Playwright (`getByRole` por nome falhava, `hasText` funcionava
normal). Não corrigido agora por ser pré-existente e fora do escopo — mencionar se o William quiser
melhorar acessibilidade depois.

### Fase 4 — Meu Plano: alerta proativo
Status: `[x] concluída` (23/07/2026) — testado de ponta a ponta no ambiente local (loja de teste com
pedido pago inserido direto no banco pra simular faturamento alto), incluindo o clique no alerta até
a tela "Meu Plano". Validado com `npx tsc -b` e `npm run build` (build completo, não só typecheck —
foi o que pegou o bug do `card.tsx` acima). Falta o William commitar/dar push.

**O que foi feito:**
- `frontend/src/lib/planos.ts` (novo) — extraído de `MeuPlano.tsx`: a lista `PLANOS`
  (Start/Pro/Scale com mensalidade e taxa) e a função `custoPlano()`/`planoMaisBarato()`. Antes esses
  números só existiam dentro de `MeuPlano.tsx`; extrair evita duplicar valores que precisam ficar em
  sincronia entre a calculadora e o alerta.
- `pages/admin/MeuPlano.tsx` — passou a importar de `lib/planos.ts` em vez de ter sua cópia local;
  comportamento idêntico ao de antes.
- `pages/admin/Inicio.tsx` — busca `loja` (nova query, a página só buscava `dashboard` antes) e
  mostra um alerta (link clicável pra `/admin/meu-plano`) sempre que o plano mais barato pro
  faturamento do mês (`dashboard.total_mes`) for diferente do plano atual da loja. Mantido no estilo
  visual "antigo" que o resto do admin já usa (não migrado pra shadcn — decisão já registrada mais
  abaixo de não migrar o resto do admin sem o William pedir).
- Sem mudança nenhuma no backend.

## Depois das 4 fases: decisão da plataforma de pagamento

O William definiu explicitamente que a escolha final entre **Asaas** e **Mercado Pago** (ver seção
"Contexto do produto" acima) só será fechada **depois** das Fases 1 a 4 estarem prontas — não
adianta o Claude Code tentar antecipar isso ou começar a integração de nenhum dos dois processadores
sem confirmação explícita do William. Quando a decisão sair, uma nova fase (Fase 5) será adicionada
aqui com a especificação da integração real.

## Backlog mais antigo, fora de escopo por enquanto (não iniciar sem o William pedir)

Esses itens já existiam antes do roadmap atual e não fazem parte da sequência das 4 fases — só
ficam registrados aqui pra não sumirem do radar:
- **Carteira Drenux** (cashback cross-loja, 1% opt-in por loja, saldo global por telefone) — já
  desenhada em detalhe em outra conversa, zero código ainda.
- **Ciclo de vida de assinatura mais robusto** — cartão recusado na renovação ainda não é tratado.
- **Resto do admin migrando pra shadcn** — só "Meu Plano" e a página pública de Planos usam shadcn
  até agora; o restante do admin ainda está no estilo antigo.

## Decisões já tomadas (não reabrir sem o William pedir)

- `SegmentoPrincipal` reaproveita os valores de `TipoProduto` (`alimenticio` / `mercadoria`) — não usar
  outros nomes como `nao_pereciveis`.
- Cada fase é implementada e validada isoladamente, não tudo de uma vez.
- shadcn é a base de tudo; Magic UI só onde faz sentido destacar algo pro cliente final ou no
  dashboard; React Bits fica de reserva, não como padrão.
