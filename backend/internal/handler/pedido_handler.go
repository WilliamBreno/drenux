package handler

import (
	"net/http"
	"time"

	"github.com/WilliamBreno/cardapio-backend/internal/service"
	"github.com/gin-gonic/gin"
)

type PedidoHandler struct {
	pedidoService *service.PedidoService
}

func NewPedidoHandler(pedidoService *service.PedidoService) *PedidoHandler {
	return &PedidoHandler{pedidoService: pedidoService}
}

type itemPedidoRequest struct {
	ProdutoID  uint  `json:"produto_id" binding:"required"`
	VariacaoID *uint `json:"variacao_id"`
	Quantidade int   `json:"quantidade" binding:"required,gt=0"`
}

type pedidoRequest struct {
	ClienteNome     string               `json:"cliente_nome" binding:"required"`
	ClienteTelefone string               `json:"cliente_telefone" binding:"required"`
	DataRetirada    time.Time            `json:"data_retirada" binding:"required"`
	Itens           []itemPedidoRequest  `json:"itens" binding:"required,min=1,dive"`
}

// Criar atende POST /lojas/:slug/pedidos — rota pública. O cliente final
// não precisa de login pra fazer um pedido.
func (h *PedidoHandler) Criar(c *gin.Context) {
	slug := c.Param("slug")

	var req pedidoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}

	itensInput := make([]service.ItemPedidoInput, len(req.Itens))
	for i, item := range req.Itens {
		itensInput[i] = service.ItemPedidoInput{
			ProdutoID:  item.ProdutoID,
			VariacaoID: item.VariacaoID,
			Quantidade: item.Quantidade,
		}
	}

	pedido, err := h.pedidoService.CriarPorSlug(slug, service.PedidoInput{
		ClienteNome:     req.ClienteNome,
		ClienteTelefone: req.ClienteTelefone,
		DataRetirada:    req.DataRetirada,
		Itens:           itensInput,
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, pedido)
}

// Listar atende GET /admin/pedidos — protegida, mostra os pedidos da
// loja do token.
func (h *PedidoHandler) Listar(c *gin.Context) {
	lojaID := c.GetUint("loja_id")

	pedidos, err := h.pedidoService.ListarPorLoja(lojaID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": err.Error()})
		return
	}
	c.JSON(http.StatusOK, pedidos)
}