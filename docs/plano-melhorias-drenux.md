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

**Processador de pagamento em migração: Stripe Connect → Mercado Pago (decisão final, fechada em
23/07/2026, depois de avaliar Mercado Pago contra Asaas).** Ainda nenhuma empresa real está
cadastrada em produção, então a troca está sendo feita antes do lançamento real — motivo principal é
o Pix (na Stripe, hoje só disponível por convite pra empresas brasileiras), e no Mercado Pago
especificamente: sem teto de quantidade de contas vinculadas (diferente da Asaas, que tem limite de
10 subcontas até homologação regulatória) e Pix cobrado em percentual (0,99%), o que favorece o
ticket baixo típico do segmento alimentício. Fórmula de comissão mantida como já decidido: Start
`max(pedido × 6,5%, R$2,50)` com a Drenux absorvendo a taxa do processador; Pro (R$129/mês+4%) e
Scale (R$349/mês+1,5%) mantêm os mesmos números, com a loja absorvendo a taxa do processador — só
troca o processador por trás, a lógica de quem paga a taxa em cada plano não muda. Ver a
especificação completa da migração na Fase 5, mais abaixo.

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
Status: `[x] concluída` — **revisão em 23/07/2026**: ao reler o arquivo antes de começar, encontrei
a fase inteira já implementada (backend e frontend, incluindo o bug do `CodigoAfiliado`/
`TokenAssinatura` e o texto final "O que sua loja vende principalmente?" / "Comida e bebida" /
"Outros produtos"). Não sobrou nenhum item da checklist abaixo em aberto. Não refiz nada — só
conferi arquivo por arquivo e validei com `go build ./...` e `npx tsc -b`, os dois passando limpo.
Checklist original mantida abaixo como referência do que foi coberto.

**Pedido novo do William (22/07/2026):** o rótulo dessa escolha pro lojista precisa de um nome
melhor que "alimentício"/"mercadoria" cru na tela — esses continuam sendo os valores internos do
enum (não mudar o `oneof=alimenticio mercadoria` no backend), só o texto exibido na interface
(pergunta + rótulo dos botões) deve ficar mais claro pro lojista leigo entender na hora do
cadastro. Sugestão a validar com o William antes de implementar (não travar nisso sozinho): algo
como "O que sua loja vende?" com opções "Comida e bebida" vs. "Outros produtos" — mas confirmar
com ele antes de fixar o texto final.

Objetivo: cada loja declara se vende principalmente produtos **alimentícios** ou **mercadoria**
(reaproveitando o enum `TipoProduto` que já existe em `domain.Produto` — não criar um vocabulário
novo). Isso: (1) define o tipo padrão de produtos novos, (2) mais pra frente vai alimentar a categoria
de negócio sugerida no onboarding da loja no processador de pagamento (Mercado Pago, ver Fase 5 e a
seção "Contexto do produto" acima; não amarrar essa lógica a campos específicos da API da Stripe),
(3) decide qual fluxo de catálogo mostrar nas Fases 2/3.

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

### Fase 2 — Variações de produto (só segmento alimentício)
Status: `[x] concluída` — **revisão em 23/07/2026**: igual a Fase 1, já estava tudo implementado
(`domain.VariacaoProduto.MostrarValorAdicional`, `variacao_handler.go`/`variacao_service.go`
repassando o campo, `VariacaoFormFields.tsx` com o checkbox, e `ProdutoCard.tsx` só mostrando o
valor adicional no cardápio público quando `mostrar_valor_adicional` é `true`). Não refiz nada,
só validei com `go build ./...` e `npx tsc -b`. **Atenção, divergência encontrada**: o código foi
além do que essa fase pedia — `VariacaoProduto` ganhou também `ModoPreco` ("aditivo"/"absoluto")
e fotos próprias por variação, e o modo "absoluto" já é usado pra produtos `mercadoria` (preço/
foto por variação, ex: modelos de um tênis). Isso contraria a decisão registrada na Fase 3 de que
`mercadoria` não usa variação, só Subcategoria/Grupo de Cor. Ver nota de divergência antes da Fase 3.

**Importante, decisão do William em 23/07/2026**: variação (`domain.VariacaoProduto`, aditiva sobre o
preço base) é um recurso de **cardápio**, não de catálogo de varejo. Essa fase se aplica **só** a
lojas com `SegmentoPrincipal = alimenticio`. Lojas `mercadoria` **não têm essa opção** — pra elas,
o mecanismo próprio é a Fase 3 (Subcategoria + Grupo de Cor), não variação. Não confundir os dois
nem tentar reaproveitar a mesma estrutura de dados entre os dois segmentos.

Objetivo, restrito a alimentício: um único ajuste no sistema de variações que hoje só tem
`PrecoAdicional` (valor somado ao preço base) — adicionar um **toggle de visibilidade do valor
adicional**: campo novo (ex: `MostrarValorAdicional bool`) pra decidir se o preço extra da variação
aparece pro cliente no cardápio público ou fica escondido.

### Fase 3 — Catálogo de varejo (só segmento "mercadoria"/outros produtos)
Status: `[x] concluída` — **revisão em 23/07/2026, confirmada com o William**: as quatro partes já
estavam implementadas de ponta a ponta. 3.1: `domain/subcategoria.go`, `domain/grupo_cor.go`,
`subcategoria_service.go`/`grupo_cor_service.go` (com checagem de dono e bloqueio de exclusão se
ainda tiver produto vinculado), rotas em `main.go`, `Categorias.tsx` + `HierarquiaCategoria.tsx` no
admin. 3.2: botão "Cadastro em massa" em `Produtos.tsx` abrindo `CadastroEmMassaDialog.tsx` (wizard
produto → fotos/variações → próximo produto, só aparece pra `mercadoria`). 3.3: `Produtos.tsx`
agrupando por Categoria → Subcategoria → Grupo de Cor pra lojas `mercadoria` (lista plana continua
pra `alimenticio`). 3.4: `CatalogoGrid.tsx` no `CardapioPublico.tsx`, grid com filtro em cascata,
layout de lista/abas mantido pra `alimenticio`. Validado com `go build ./...` e `npx tsc -b`, sem
nenhuma mudança de código — só confirmação.

**Reescrita em 23/07/2026** a partir de feedback do William — essa fase deixou de ser só "cadastro em
massa" e virou uma reestruturação de como o catálogo funciona pra lojas de varejo (roupa, sapato,
produtos do gênero). São quatro partes, todas exclusivas de `SegmentoPrincipal = mercadoria` (não
aparecem/não fazem sentido pra loja alimentício):

**3.1 — Hierarquia Categoria → Subcategoria → Grupo de Cor**
- Uma `Categoria` existente (ex: "Tênis") ganha **Subcategorias opcionais**, pensadas pra representar
  tamanho (ex: "40", "41", "42").
- Dentro de uma Subcategoria, opcionalmente também um **Grupo de Cor** (ex: "Tons escuros", "Branco").
- Leitura confirmada com o William: isso é um drill-down (Categoria → Subcategoria → Grupo de Cor),
  **não** o mesmo conceito de variação da Fase 2 — os dois sistemas não se misturam. Pra
  `mercadoria`, a Fase 2 (variação) nem aparece como opção.
- **Cardinalidade**: uma combinação de Subcategoria + Grupo de Cor pode conter **vários produtos
  diferentes** (ex: várias camisas diferentes que são todas tamanho 42 e todas de cor escura) — não é
  uma relação 1:1 produto↔combinação.
- **Tudo opcional**: o lojista decide se usa Subcategoria, se usa Grupo de Cor dentro dela, ou nenhum
  dos dois — cadastro simples de produto sem essa estrutura continua funcionando normalmente.
- **Confirmado com o William (23/07/2026)**: Grupo de Cor é sempre aninhado dentro de uma
  Subcategoria — Categoria → Subcategoria → Grupo de Cor é uma cadeia só, não duas facetas
  paralelas independentes. Implementar o schema já nessa estrutura, sem alternativa a considerar.

**3.2 — Cadastro em massa**
- Botão de "adicionar produtos em sequência" (cadastro rápido, um atrás do outro, sem fechar o
  formulário) — vive **dentro da própria tela de Produtos** (não em tela separada), e só aparece
  quando a loja é `mercadoria`.

**3.3 — Exibição organizada no admin**
- A lista de produtos no admin, pra lojas `mercadoria`, precisa refletir visualmente a hierarquia
  Categoria/Subcategoria/Grupo de Cor de forma organizada — não é só uma lista plana como hoje.

**3.4 — Catálogo público em formato de e-commerce**
- Pra lojas `mercadoria`, a página pública do cardápio muda de layout: sai do formato lista-por-
  categoria (estilo cardápio de comida) e vira algo mais parecido com catálogo de loja online (grid
  de produtos, navegação/filtro por categoria → subcategoria → grupo de cor). Loja `alimenticio`
  mantém o layout atual, sem mudança.

### Fase 4 — Meu Plano: alerta proativo
Status: `[x] concluída` — **revisão em 23/07/2026**: já implementado em `pages/admin/Inicio.tsx`,
reaproveitando `PLANOS`/`custoPlano`/`planoMaisBarato` de `lib/planos.ts` (a mesma lógica de
`MeuPlano.tsx`). Mostra o alerta só quando há economia real (`economiaMensal > 0`) e o plano
recomendado é diferente do atual, com link direto pra "Meu Plano". Validado com `npx tsc -b`, sem
nenhuma mudança de código.

O essencial de "Meu Plano" **já existe** em `pages/admin/MeuPlano.tsx`: planos Start/Pro/Scale reais,
troca de plano funcionando (com downgrade agendado pra renovação + cancelamento), e uma recomendação
de "mais barato pra você" já calculada com o faturamento real do mês (`dashboard.total_mes`).

O que falta: essa recomendação só aparece se o lojista entrar na tela "Meu Plano". Objetivo da fase:
expor um alerta proativo em `pages/admin/Inicio.tsx` (ou `Dashboard.tsx`) reaproveitando a mesma lógica
de cálculo que já existe em `MeuPlano.tsx`, avisando quando o faturamento do mês ultrapassa o ponto de
equilíbrio pra outro plano.

### Fase 5 — Integração real com o Mercado Pago (decisão fechada em 23/07/2026)
Status: `[~] 5.1–5.4 implementadas em 23/07/2026, ainda NÃO testadas contra o Mercado Pago de
verdade — 5.5 continua pendente de decisão do William`

**O que foi implementado (código novo, revisar antes de confiar em produção):**
- `domain/loja.go`: `MercadoPagoAccessToken`/`MercadoPagoRefreshToken`/`MercadoPagoUserID`/
  `MercadoPagoTokenExpiraEm`. `domain/pedido.go`: `MercadoPagoPreferenceID`.
- `config.go`: `MERCADOPAGO_CLIENT_ID`, `MERCADOPAGO_CLIENT_SECRET`, `MERCADOPAGO_WEBHOOK_SECRET`
  (chave separada, configurada no painel do Mercado Pago, usada só pra validar a assinatura do
  webhook) e `API_PUBLIC_URL` (endereço público desta API — precisa bater com o redirect_uri
  cadastrado na aplicação do Mercado Pago).
- `service/mercadopago_service.go` (novo): onboarding OAuth (`state` é um JWT curto assinado com o
  mesmo `JWT_SECRET`, carregando o `loja_id` — o callback do Mercado Pago não manda nenhum header
  nosso, é um redirect de navegador puro), troca de código por token, renovação via refresh_token,
  checkout de pedido via `POST /checkout/preferences` com `marketplace_fee` usando o access_token da
  própria loja, e processamento do webhook (`GET /v1/payments/:id` com token de aplicação
  `client_credentials`, cross-check do `collector_id` contra a loja do pedido).
- `service/pos_pagamento_service.go` (novo): a lógica de desconto de estoque + notificação
  WhatsApp que antes vivia só dentro do `StripeService` foi extraída pra cá, porque agora é chamada
  tanto pelo pagamento de pedido via Mercado Pago quanto (indiretamente) pela Stripe — evita ter a
  mesma lógica de estoque duplicada e divergindo com o tempo entre os dois processadores.
- `handler/mercadopago_handler.go` (novo) + rotas em `main.go`: `GET /admin/mercadopago/onboarding`
  e `GET /admin/mercadopago/status` (autenticadas), `GET /admin/mercadopago/callback` (pública —
  não dá pra proteger com JWT porque quem chama é o redirect do navegador vindo do Mercado Pago, sem
  nenhum header nosso), `POST /webhooks/mercadopago` (pública, valida assinatura), e
  `POST /mercadopago/renovar-tokens` (pública, protegida por `X-Cron-Secret`, mesmo padrão do
  `/relatorio/semanal` — precisa de um cron externo tipo cron-job.org batendo nela periodicamente,
  igual já existe pro relatório).
- **`POST /pedidos/:id/checkout` agora chama o Mercado Pago, não mais a Stripe** — só essa rota.
  `POST /solicitacoes/:id/checkout` (frete de itens guardados) e `/planos/checkout` (assinatura
  Pro/Scale) continuam na Stripe, como o texto original da Fase 5.2 pedia (só menciona
  `/pedidos/:id/checkout`) — não presumi que o resto também devesse migrar. O código da Stripe
  inteiro continua no repositório, só parou de ser chamado nessa rota específica.
- Frontend: `Configuracoes.tsx`, bloco "Pagamento" trocado de Stripe pra Mercado Pago (mesmo padrão
  visual, `api/admin.ts` com `iniciarOnboardingMercadoPago`/`statusMercadoPago`).

**Ressalvas importantes antes de ir pra produção:**
1. **Nada disso foi testado contra a API real do Mercado Pago** — não há credenciais de sandbox
   nesse ambiente. Antes de confiar: criar a aplicação "drenux-marketplace" no Mercado Pago
   Developers, pegar `MERCADOPAGO_CLIENT_ID`/`MERCADOPAGO_CLIENT_SECRET`/`MERCADOPAGO_WEBHOOK_SECRET`
   de teste, testar o fluxo de onboarding OAuth ponta a ponta, criar um pagamento de teste e conferir
   se o webhook chega e é validado corretamente.
2. A validação de assinatura do webhook (`ValidarAssinaturaWebhook` em `mercadopago_service.go`)
   segue o algoritmo documentado publicamente pelo Mercado Pago (`x-signature` com manifest
   `id:...;request-id:...;ts:...;`), mas isso é exatamente o tipo de detalhe que costuma ter
   pegadinha na prática — validar contra uma notificação real antes de confiar que pagamentos vão
   ser aceitos/rejeitados corretamente.
3. **Fase 5.5 (repasse de comissão de afiliado) não foi implementada** — nem deveria, o texto
   original já pedia decisão do William antes. Hoje, um pedido pago via Mercado Pago numa loja com
   afiliado vinculado só gera um log de aviso (`ProcessarNotificacaoPagamento` em
   `mercadopago_service.go`) — o repasse precisa ser feito manualmente até isso ser resolvido.
4. `GET /admin/mercadopago/onboarding` devolve JSON (`{ url }`) pro frontend redirecionar, em vez de
   um redirect HTTP direto do backend — diferente do texto original da Fase 5.1 ("redireciona a loja
   pra lá"), mas necessário: essa rota exige o Bearer token do dono (só ele pode iniciar o onboarding
   da própria loja), e um redirect de navegador puro não carrega esse header. É o mesmo padrão que já
   existia pro onboarding da Stripe nesse projeto.
5. Validado só com `go build ./...`, `go vet ./...`, `npx tsc -b` e `npm run build` — nenhum teste de
   integração real.

**Decisão fechada**: Mercado Pago, não Asaas. Motivo resumido (contexto completo na seção
"Contexto do produto" acima e no histórico de decisões): sem teto de quantidade de contas
vinculadas (cada Loja usa a própria conta Mercado Pago via OAuth, não uma subconta criada pela
Drenux), Pix cobrado em percentual (0,99%) o que favorece o ticket baixo típico do segmento
alimentício, e Split 1:1 já validado tecnicamente em Sandbox (preferência e pagamento aceitos com
`marketplace_fee`/`application_fee`, apontando o `collector_id` certo pro vendedor).

**Confirmado com o William (23/07/2026)**: como nenhuma loja real
está em produção ainda, a integração da Stripe deve ser **substituída por completo** pelo Mercado
Pago (não manter os dois rodando em paralelo) — mas não apagar o código da Stripe do histórico do
git, só parar de chamá-lo ativamente. Se o William quiser manter a Stripe como opção secundária por
algum motivo, avisar antes de remover qualquer rota/handler dela.

**5.1 — Backend: conexão da Loja com o Mercado Pago (equivalente ao onboarding Stripe)**
- Novo campo em `domain.Loja`: dados da autorização OAuth — `MercadoPagoAccessToken`,
  `MercadoPagoRefreshToken`, `MercadoPagoUserID` (o `collector_id`), `MercadoPagoTokenExpiraEm`
  (data, pra saber quando precisa renovar — token válido por 6 meses).
- Novo handler `mercadopago_handler.go`, espelhando o padrão de `stripe_handler.go`:
  - `GET /admin/mercadopago/onboarding` — monta a URL de autorização OAuth
    (`https://auth.mercadopago.com.br/authorization?client_id=...&response_type=code&platform_id=mp&redirect_uri=...`)
    e redireciona a loja pra lá.
  - `GET /admin/mercadopago/callback` — recebe o `code` de volta, troca pelo `access_token` via
    `POST https://api.mercadopago.com/oauth/token`, salva os dados na `Loja`.
  - `GET /admin/mercadopago/status` — equivalente ao `/admin/stripe/status` já existente.
- Novo `mercadopago_service.go` com essa lógica de troca de token e chamadas à API.
- **Variáveis de ambiente novas**: `MERCADOPAGO_CLIENT_ID`, `MERCADOPAGO_CLIENT_SECRET` (da
  aplicação "drenux-marketplace" — usar as de produção quando for a hora, não as de teste que já
  usamos nessa conversa).

**5.2 — Backend: checkout e split**
- Trocar a criação de cobrança que hoje usa a Stripe (`/pedidos/:id/checkout`) pra usar a API do
  Mercado Pago, com `application_fee` calculado pela mesma fórmula de plano que já existe (Start:
  `max(pedido × 6,5%, R$2,50)`; Pro/Scale: percentuais já definidos) — só troca o processador por
  trás, a lógica de cálculo de comissão não muda.
- Usar o `access_token` da própria Loja (salvo em 5.1) pra criar o pagamento, não o token da
  plataforma.

**5.3 — Backend: webhook**
- Novo endpoint `POST /webhooks/mercadopago`, substituindo/complementando `/webhooks/stripe`.
- Validar a assinatura do webhook (o Mercado Pago manda uma assinatura no header — verificar antes
  de processar qualquer evento, mesmo padrão de segurança que já fizemos com o `whsec_` da Stripe).
- Escutar pelo menos o evento de pagamento aprovado, pra disparar o mesmo fluxo que já existe hoje
  (desconto de estoque, notificação WhatsApp, incremento de uso de cupom).

**5.4 — Renovação automática do token (a cada 6 meses)**
- Como o `access_token` de cada loja expira em 6 meses, criar uma rotina (cron ou verificação no
  login do admin) que renova via `refresh_token` **antes** de expirar — evitar que uma loja perca a
  capacidade de receber pagamento silenciosamente por token vencido.

**5.5 — Em aberto, precisa de pesquisa antes de implementar: repasse de comissão do afiliado**
Hoje o repasse do afiliado usa `Stripe Transfer` (a plataforma recebe o valor cheio via
`application_fee`, depois transfere uma parte pra conta Stripe Connect do afiliado, separado do
pedido original). **Não confirmamos ainda o equivalente disso no Mercado Pago** — não presumir que
existe uma função pronta de "enviar dinheiro pra terceiro" até verificar na documentação oficial.
Duas hipóteses a investigar, nessa ordem:
1. Afiliado também vira "vendedor" com conta MP própria vinculada via OAuth, e a divisão de 3 partes
   (Loja + Drenux + Afiliado) acontece na mesma transação — isso exigiria o modelo **1:N** do
   Mercado Pago, que precisa de contato comercial pra habilitar (diferente do 1:1, que é self-service).
2. A Drenux recebe o valor cheio da comissão (1:1 normal com a Loja) e faz um repasse **separado**
   pro afiliado por fora (Pix manual/agendado), sem usar split nenhum pra essa parte — mais parecido
   com o padrão atual da Stripe.
Confirmar com o William qual caminho seguir antes de escrever qualquer código de repasse de
afiliado — essa parte não deve ser implementada só com suposição.

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
