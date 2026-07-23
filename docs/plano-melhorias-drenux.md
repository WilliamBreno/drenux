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
Status: `[x] concluída` — revisão em 23/07/2026 confirmou que backend e frontend já tinham a fase
inteira implementada (commit `0c52bca`, 22/07 15:45), incluindo o rótulo amigável pedido pelo
William ("O que sua loja vende principalmente?" / "Comida e bebida" / "Outros produtos") e o fix do
`CodigoAfiliado`/`TokenAssinatura` no cadastro. `go build ./...` e `tsc -b` passaram sem erros. Se o
seletor não apareceu no teste de produção de 22/07, o motivo provável é deploy desatualizado
(o commit é do mesmo dia, possivelmente depois do teste) — vale conferir se o ambiente de produção
está rodando esse commit antes de investigar mais código.

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

### Fase 2 — Variações de produto (só segmento alimentício)
Status: `[x] concluída` — revisão em 23/07/2026 confirmou que o toggle `MostrarValorAdicional` já
estava implementado ponta a ponta (domain, handler, service, `VariacaoFormFields.tsx`,
`ProdutoCard.tsx`). `go build ./...` e `tsc -b` passam sem erros.

**Atenção pro William antes da Fase 3** — achado importante durante a revisão: o sistema de
variação atual **já foi além do descrito nesta fase** numa sessão anterior e hoje tem um campo
`ModoPreco` (`aditivo`/`absoluto`) + fotos por variação, e o modo `absoluto` já está sendo usado
**pra mercadoria** (`VariacaoFormFields`, `CadastroEmMassaDialog.tsx` já existe e usa variação com
`modo_preco: 'absoluto'` como cadastro em massa pra mercadoria). Isso conflita com a decisão de
23/07 registrada na Fase 3 abaixo, que diz que variação é exclusiva de alimentício e que mercadoria
deve usar Subcategoria→Grupo de Cor, **não** reaproveitar a estrutura de variação. Nenhum código de
Subcategoria/Grupo de Cor existe ainda no domain. Antes de implementar a Fase 3 como está descrita,
confirmar com o William se: (a) descarta/adapta o `CadastroEmMassaDialog.tsx` e o modo `absoluto`
existentes em favor da hierarquia Categoria→Subcategoria→Grupo de Cor documentada, ou (b) a
decisão de 23/07 deve ser revista pra incorporar o que já foi construído.

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
Status: `[x] concluída` — implementada em 23/07/2026 seguindo o plano documentado (decisão do William:
manter a hierarquia Subcategoria/Grupo de Cor como escrita aqui, e resolver separadamente o que
fazer com o `modo_preco: 'absoluto'` + `CadastroEmMassaDialog.tsx` que já existiam de uma sessão
anterior — ver nota na Fase 2 acima). `go build ./...`, `tsc -b` e `npm run build` passam sem erros.

**O que mudou:**
- **Backend**: novos modelos `domain.Subcategoria` (`categoria_id` + `nome` únicos) e
  `domain.GrupoCor` (`subcategoria_id` + `nome` únicos), com repository/service/handler próprios
  (`subcategoria_repository.go`, `grupo_cor_repository.go`, `subcategoria_service.go`,
  `grupo_cor_service.go`, `subcategoria_handler.go`, `grupo_cor_handler.go`). `domain.Produto` ganhou
  `SubcategoriaID`/`GrupoCorID` opcionais, validados em cadeia (`produto_service.go`,
  `validarSubcategoriaEGrupo`) — grupo de cor só é aceito se pertencer à subcategoria informada, e
  a subcategoria só é aceita se pertencer à categoria do produto. Rotas novas em `main.go`:
  `GET/POST /admin/categorias/:categoriaId/subcategorias`, `PUT/DELETE /admin/subcategorias/:id`,
  `GET/POST /admin/subcategorias/:subcategoriaId/grupos-cor`, `PUT/DELETE /admin/grupos-cor/:id`
  (mais `GET /admin/subcategorias` e `GET /admin/grupos-cor` pra buscar a hierarquia inteira da loja
  de uma vez). O catálogo público (`catalogo_service.go`/`catalogo_handler.go`) agora expõe
  `segmento_principal`, `subcategorias` e `grupos_cor` também.
- **Frontend (3.1 — hierarquia)**: `Categorias.tsx` ganhou gerenciamento de Subcategoria/Grupo de Cor
  por categoria (só quando `loja.segmento_principal === 'mercadoria'`), via novo componente
  `components/admin/HierarquiaCategoria.tsx`. `ProdutoFormFields.tsx` ganhou os selects opcionais de
  Subcategoria/Grupo de Cor (encadeados: trocar categoria limpa a subcategoria escolhida).
- **Frontend (3.2 — cadastro em massa)**: o botão "Cadastro em massa" em `Produtos.tsx` agora só
  aparece pra lojas `mercadoria` (antes aparecia sempre); `CadastroEmMassaDialog.tsx` passou a
  receber e repassar `subcategorias`/`gruposCor` pro formulário.
- **Frontend (3.3 — exibição organizada)**: `Produtos.tsx` foi reestruturado — o card de produto
  virou uma função reaproveitável (`renderProduto`) usada tanto na lista plana (alimentício, sem
  mudança visual) quanto numa lista agrupada por Categoria → Subcategoria → Grupo de Cor
  (`renderProdutosDaCategoria`, só pra mercadoria).
- **Frontend (3.4 — catálogo público e-commerce)**: novo `components/CatalogoGrid.tsx` (navegação em
  chips Categoria → Subcategoria → Grupo de Cor + grid de produtos) e `components/ProdutoCardGrid.tsx`
  (card vertical). `CardapioPublico.tsx` escolhe entre esse layout novo e o layout de lista original
  (`AbasCategorias` + `ProdutoCard`) com base em `data.loja.segmento_principal` — lojas alimentício
  não têm nenhuma mudança visual.

**Ainda em aberto, sem decisão automática**: o `modo_preco: 'absoluto'` de `VariacaoProduto` (preço e
fotos por variação) continua existindo e sendo sugerido como padrão pra mercadoria em
`abrirNovaVariacao`/`variacaoVazia` — ele não foi removido nem unificado com a hierarquia
Subcategoria/Grupo de Cor nova. As duas ferramentas coexistem por enquanto (variação = opção dentro
de um produto; Subcategoria/Grupo de Cor = organização entre produtos diferentes). Se isso gerar
confusão de UX na prática, revisar com o William antes de mexer.

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
Status: `[x] concluída` — revisão em 23/07/2026 confirmou que já estava implementada no mesmo commit
`0c52bca` (22/07) das Fases 1/2. A lógica de custo/plano mais barato foi extraída de `MeuPlano.tsx`
pra `lib/planos.ts` (`PLANOS`, `custoPlano`, `planoMaisBarato`) exatamente pra ser reaproveitada sem
duplicar números — `pages/admin/Inicio.tsx` já mostra o alerta proativo (linha 48-58) linkando pra
`/admin/meu-plano`, calculado com `dashboard.total_mes`. `tsc -b` e `npm run build` já validados.

O essencial de "Meu Plano" **já existe** em `pages/admin/MeuPlano.tsx`: planos Start/Pro/Scale reais,
troca de plano funcionando (com downgrade agendado pra renovação + cancelamento), e uma recomendação
de "mais barato pra você" já calculada com o faturamento real do mês (`dashboard.total_mes`).

O que falta: essa recomendação só aparece se o lojista entrar na tela "Meu Plano". Objetivo da fase:
expor um alerta proativo em `pages/admin/Inicio.tsx` (ou `Dashboard.tsx`) reaproveitando a mesma lógica
de cálculo que já existe em `MeuPlano.tsx`, avisando quando o faturamento do mês ultrapassa o ponto de
equilíbrio pra outro plano.

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
