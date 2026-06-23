package handler

import (
	"net/http"
	"strconv"

	"github.com/WilliamBreno/cardapio-backend/internal/service"
	"github.com/gin-gonic/gin"
)

type VariacaoHandler struct {
	variacaoService *service.VariacaoService
}

func NewVariacaoHandler(variacaoService *service.VariacaoService) *VariacaoHandler {
	return &VariacaoHandler{variacaoService: variacaoService}
}

func parseProdutoID(c *gin.Context) (uint, error) {
	id, err := strconv.ParseUint(c.Param("produtoId"), 10, 64)
	return uint(id), err
}

func parseVariacaoID(c *gin.Context) (uint, error) {
	id, err := strconv.ParseUint(c.Param("variacaoId"), 10, 64)
	return uint(id), err
}

type variacaoRequest struct {
	Nome           string  `json:"nome" binding:"required"`
	PrecoAdicional float64 `json:"preco_adicional"`
	Disponivel     bool    `json:"disponivel"`
	EstoqueAtual   *int    `json:"estoque_atual"`
	EstoqueAlerta  *int    `json:"estoque_alerta"`
	Ordem          int     `json:"ordem"`
}

func (h *VariacaoHandler) Listar(c *gin.Context) {
	lojaID := c.GetUint("loja_id")
	produtoID, err := parseProdutoID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "produto_id inválido"})
		return
	}

	variacoes, err := h.variacaoService.Listar(lojaID, produtoID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}
	c.JSON(http.StatusOK, variacoes)
}

func (h *VariacaoHandler) Criar(c *gin.Context) {
	lojaID := c.GetUint("loja_id")
	produtoID, err := parseProdutoID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "produto_id inválido"})
		return
	}

	var req variacaoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}

	v, err := h.variacaoService.Criar(lojaID, produtoID, service.VariacaoInput{
		Nome:           req.Nome,
		PrecoAdicional: req.PrecoAdicional,
		Disponivel:     req.Disponivel,
		EstoqueAtual:   req.EstoqueAtual,
		EstoqueAlerta:  req.EstoqueAlerta,
		Ordem:          req.Ordem,
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, v)
}

func (h *VariacaoHandler) Atualizar(c *gin.Context) {
	lojaID := c.GetUint("loja_id")
	produtoID, err := parseProdutoID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "produto_id inválido"})
		return
	}
	variacaoID, err := parseVariacaoID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "variacao_id inválido"})
		return
	}

	var req variacaoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}

	v, err := h.variacaoService.Atualizar(lojaID, produtoID, variacaoID, service.VariacaoInput{
		Nome:           req.Nome,
		PrecoAdicional: req.PrecoAdicional,
		Disponivel:     req.Disponivel,
		EstoqueAtual:   req.EstoqueAtual,
		EstoqueAlerta:  req.EstoqueAlerta,
		Ordem:          req.Ordem,
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}
	c.JSON(http.StatusOK, v)
}

func (h *VariacaoHandler) Deletar(c *gin.Context) {
	lojaID := c.GetUint("loja_id")
	produtoID, err := parseProdutoID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "produto_id inválido"})
		return
	}
	variacaoID, err := parseVariacaoID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "variacao_id inválido"})
		return
	}

	if err := h.variacaoService.Deletar(lojaID, produtoID, variacaoID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}