package handler

import (
	"net/http"

	"github.com/WilliamBreno/cardapio-backend/internal/service"
	"github.com/gin-gonic/gin"
)

type ProdutoHandler struct {
	produtoService *service.ProdutoService
}

func NewProdutoHandler(produtoService *service.ProdutoService) *ProdutoHandler {
	return &ProdutoHandler{produtoService: produtoService}
}

func (h *ProdutoHandler) Listar(c *gin.Context) {
	lojaID := c.GetUint("loja_id")

	produtos, err := h.produtoService.Listar(lojaID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": err.Error()})
		return
	}
	c.JSON(http.StatusOK, produtos)
}

type produtoRequest struct {
	Nome        string  `json:"nome" binding:"required"`
	Descricao   string  `json:"descricao"`
	Preco       float64 `json:"preco" binding:"required,gt=0"`
	FotoURL     string  `json:"foto_url"`
	Disponivel  bool    `json:"disponivel"`
	CategoriaID uint    `json:"categoria_id" binding:"required"`
}

func (h *ProdutoHandler) Criar(c *gin.Context) {
	lojaID := c.GetUint("loja_id")

	var req produtoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}

	produto, err := h.produtoService.Criar(lojaID, service.ProdutoInput{
		Nome:        req.Nome,
		Descricao:   req.Descricao,
		Preco:       req.Preco,
		FotoURL:     req.FotoURL,
		Disponivel:  req.Disponivel,
		CategoriaID: req.CategoriaID,
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, produto)
}

func (h *ProdutoHandler) Atualizar(c *gin.Context) {
	lojaID := c.GetUint("loja_id")

	produtoID, err := parseIDParam(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "id inválido"})
		return
	}

	var req produtoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}

	produto, err := h.produtoService.Atualizar(lojaID, produtoID, service.ProdutoInput{
		Nome:        req.Nome,
		Descricao:   req.Descricao,
		Preco:       req.Preco,
		FotoURL:     req.FotoURL,
		Disponivel:  req.Disponivel,
		CategoriaID: req.CategoriaID,
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}
	c.JSON(http.StatusOK, produto)
}

func (h *ProdutoHandler) Deletar(c *gin.Context) {
	lojaID := c.GetUint("loja_id")

	produtoID, err := parseIDParam(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "id inválido"})
		return
	}

	if err := h.produtoService.Deletar(lojaID, produtoID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}