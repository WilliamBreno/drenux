package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/WilliamBreno/cardapio-backend/internal/config"
	"github.com/WilliamBreno/cardapio-backend/internal/database"
	"github.com/WilliamBreno/cardapio-backend/internal/domain"
	"github.com/WilliamBreno/cardapio-backend/internal/handler"
	"github.com/WilliamBreno/cardapio-backend/internal/middleware"
	"github.com/WilliamBreno/cardapio-backend/internal/notification"
	"github.com/WilliamBreno/cardapio-backend/internal/service"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()

	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("erro ao conectar no banco: %v", err)
	}
	log.Println("conectado ao banco com sucesso")

	// AutoMigrate cria as tabelas que ainda não existem e adiciona colunas
	// novas que apareçam no struct. A ordem importa por causa das chaves
	// estrangeiras: Usuario antes de Loja (Loja referencia Usuario), Loja
	// antes de Categoria (Categoria referencia Loja), Categoria antes de
	// Produto (Produto referencia Categoria), Pedido depois de Loja, e
	// ItemPedido por último (referencia Pedido).
	if err := db.AutoMigrate(
		&domain.Usuario{},
		&domain.Loja{},
		&domain.Categoria{},
		&domain.Produto{},
		&domain.FotoProduto{},
		&domain.VariacaoProduto{},
		&domain.Cupom{},
		&domain.Pedido{},
		&domain.ItemPedido{},
	); err != nil {
		log.Fatalf("erro ao migrar o banco: %v", err)
	}
	log.Println("migrations aplicadas com sucesso")

	// Não tem mais seed global de categorias aqui — agora cada loja ganha
	// suas próprias "Salgados"/"Doces" no momento do cadastro (etapa que
	// ainda vamos construir).

	router := gin.Default()

	// CORS: sem isso, o navegador bloqueia o frontend (rodando numa porta
	// diferente, ex: 5173) de chamar essa API (porta 8080) — é uma regra
	// de segurança do próprio navegador, não da nossa aplicação. curl e
	// Postman não têm esse bloqueio, por isso só apareceu agora que o
	// front começou a chamar de verdade.
	router.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.FrontendURLs,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	authService := service.NewAuthService(db, cfg.JWTSecret)
	authHandler := handler.NewAuthHandler(authService)

	catalogoService := service.NewCatalogoService(db)
	catalogoHandler := handler.NewCatalogoHandler(catalogoService, db)

	categoriaService := service.NewCategoriaService(db)
	categoriaHandler := handler.NewCategoriaHandler(categoriaService)

	produtoService := service.NewProdutoService(db)
	produtoHandler := handler.NewProdutoHandler(produtoService)

	variacaoService := service.NewVariacaoService(db)
	variacaoHandler := handler.NewVariacaoHandler(variacaoService)

	pedidoService := service.NewPedidoService(db)
	pedidoHandler := handler.NewPedidoHandler(pedidoService)

	// WhatsApp não é mais fatal: se não estiver pareado (ou se der
	// qualquer erro), o servidor sobe mesmo assim — só fica sem mandar
	// notificação até o pareamento ser refeito. Cardápio, carrinho e
	// pagamento não podem depender disso pra funcionar.
	var whatsappSender notification.NotificationSender
	ws, err := notification.NewWhatsmeowSender(context.Background(), cfg.DatabaseURL)
	if err != nil {
		log.Printf("aviso: WhatsApp não conectado (%v) — pedidos pagos não vão notificar até isso ser resolvido. Rode 'go run ./cmd/whatsapp-pair' apontando pro banco certo e reinicie.", err)
	} else {
		whatsappSender = ws
		defer ws.Close()
		log.Println("WhatsApp conectado com sucesso")
	}

	stripeService := service.NewStripeService(cfg.StripeSecretKey, cfg.StripeWebhookSecret, db, whatsappSender)
	stripeHandler := handler.NewStripeHandler(stripeService, cfg.FrontendURLs[0])

	lojaService := service.NewLojaService(db)
	lojaHandler := handler.NewLojaHandler(lojaService)

	dashboardService := service.NewDashboardService(db)
	dashboardHandler := handler.NewDashboardHandler(dashboardService)
	fotoHandler := handler.NewFotoHandler(db)

	cupomService := service.NewCupomService(db)
	cupomHandler := handler.NewCupomHandler(cupomService)

	relatorioService := service.NewRelatorioService(db, whatsappSender)
	relatorioHandler := handler.NewRelatorioHandler(relatorioService, cfg.CronSecret)

	router.POST("/auth/cadastro", authHandler.Cadastrar)
	router.POST("/auth/login", authHandler.Login)

	// Rotas públicas — sem autenticação. É como o cliente final acessa o
	// cardápio e faz um pedido numa loja específica, pelo slug.
	router.GET("/lojas/:slug", catalogoHandler.BuscarCardapio)
	router.GET("/lojas/:slug/historico", catalogoHandler.BuscarHistorico)
	router.POST("/lojas/:slug/pedidos", pedidoHandler.Criar)
	router.POST("/lojas/:slug/cupons/validar", func(c *gin.Context) {
		// Resolve o loja_id a partir do slug pra usar no handler
		loja, err := lojaService.BuscarPorSlug(c.Param("slug"))
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"erro": "loja não encontrada"})
			return
		}
		c.Set("loja_id_publico", loja.ID)
		cupomHandler.Validar(c)
	})
	router.POST("/pedidos/:id/checkout", stripeHandler.Checkout)

	// Webhook da Stripe — chamado pela Stripe, não por usuário. Validado
	// por assinatura, não por JWT.
	router.POST("/webhooks/stripe", stripeHandler.Webhook)

	// Relatório semanal — chamado pelo cron-job.org todo domingo.
	// Protegido por X-Cron-Secret, não por JWT.
	router.POST("/relatorio/semanal", relatorioHandler.EnviarSemanal)

	// Grupo de rotas administrativas — tudo aqui dentro exige token válido.
	admin := router.Group("/admin")
	admin.Use(middleware.AuthRequired(cfg.JWTSecret))
	admin.GET("/me", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"usuario_id": c.GetUint("usuario_id"),
			"loja_id":    c.GetUint("loja_id"),
		})
	})

	admin.GET("/categorias", categoriaHandler.Listar)
	admin.POST("/categorias", categoriaHandler.Criar)
	admin.PUT("/categorias/:id", categoriaHandler.Atualizar)
	admin.DELETE("/categorias/:id", categoriaHandler.Deletar)

	admin.GET("/produtos", produtoHandler.Listar)
	admin.POST("/produtos", produtoHandler.Criar)
	admin.PUT("/produtos/:id", produtoHandler.Atualizar)
	admin.DELETE("/produtos/:id", produtoHandler.Deletar)

	admin.GET("/dashboard", dashboardHandler.Dados)

	admin.GET("/cupons", cupomHandler.Listar)
	admin.POST("/cupons", cupomHandler.Criar)
	admin.PUT("/cupons/:id", cupomHandler.Atualizar)
	admin.DELETE("/cupons/:id", cupomHandler.Deletar)

	admin.POST("/fotos/:produtoId", fotoHandler.Adicionar)
	admin.DELETE("/fotos/:produtoId/:fotoId", fotoHandler.Deletar)

	// Variações num sub-grupo separado pra evitar conflito com :id do produto.
	// O Gin não permite :id e :produtoId no mesmo prefixo.
	variacoes := admin.Group("/variacoes")
	variacoes.GET("/:produtoId", variacaoHandler.Listar)
	variacoes.POST("/:produtoId", variacaoHandler.Criar)
	variacoes.PUT("/:produtoId/:variacaoId", variacaoHandler.Atualizar)
	variacoes.DELETE("/:produtoId/:variacaoId", variacaoHandler.Deletar)

	admin.GET("/pedidos", pedidoHandler.Listar)

	admin.POST("/stripe/onboarding", stripeHandler.IniciarOnboarding)
	admin.GET("/stripe/status", stripeHandler.Status)

	admin.GET("/loja", lojaHandler.Buscar)
	admin.PUT("/loja", lojaHandler.AtualizarConfiguracoes)

	// Health check: confirma que o servidor está de pé E que o banco está
	// respondendo. Útil também depois pro Render usar como health check
	// do serviço (ele consulta essa rota pra saber se o deploy está saudável).
	router.GET("/health", func(c *gin.Context) {
		sqlDB, err := db.DB()
		if err != nil || sqlDB.Ping() != nil {
			c.JSON(500, gin.H{"status": "erro", "banco": "indisponível"})
			return
		}
		c.JSON(200, gin.H{"status": "ok", "banco": "conectado"})
	})

	log.Printf("servidor rodando na porta %s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("erro ao iniciar servidor: %v", err)
	}
}
