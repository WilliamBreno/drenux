package handler

import (
	"net/http"
	"strconv"

	"github.com/WilliamBreno/cardapio-backend/internal/domain"
	"github.com/WilliamBreno/cardapio-backend/internal/repository"
	"github.com/WilliamBreno/cardapio-backend/internal/service"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
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
	Nome                  string  `json:"nome" binding:"required"`
	PrecoAdicional        float64 `json:"preco_adicional"`
	Disponivel            bool    `json:"disponivel"`
	MostrarValorAdicional bool    `json:"mostrar_valor_adicional"`
	ModoPreco             string  `json:"modo_preco" binding:"omitempty,oneof=aditivo absoluto"`
	EstoqueAtual          *int    `json:"estoque_atual"`
	EstoqueAlerta         *int    `json:"estoque_alerta"`
	Ordem                 int     `json:"ordem"`
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
		Nome:                  req.Nome,
		PrecoAdicional:        req.PrecoAdicional,
		Disponivel:            req.Disponivel,
		MostrarValorAdicional: req.MostrarValorAdicional,
		ModoPreco:             req.ModoPreco,
		EstoqueAtual:          req.EstoqueAtual,
		EstoqueAlerta:         req.EstoqueAlerta,
		Ordem:                 req.Ordem,
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
		Nome:                  req.Nome,
		PrecoAdicional:        req.PrecoAdicional,
		Disponivel:            req.Disponivel,
		MostrarValorAdicional: req.MostrarValorAdicional,
		ModoPreco:             req.ModoPreco,
		EstoqueAtual:          req.EstoqueAtual,
		EstoqueAlerta:         req.EstoqueAlerta,
		Ordem:                 req.Ordem,
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

// ─── Fotos de variação ──────────────────────────────────────────────────────
// Só faz sentido pro modo de preço "absoluto" (ver domain.ModoPrecoVariacao),
// mas não é validado aqui — o dono pode adicionar fotos independente do modo.

type FotoVariacaoHandler struct {
	fotoRepo     *repository.FotoVariacaoRepository
	variacaoRepo *repository.VariacaoRepository
	produtoRepo  *repository.ProdutoRepository
}

func NewFotoVariacaoHandler(db *gorm.DB) *FotoVariacaoHandler {
	return &FotoVariacaoHandler{
		fotoRepo:     repository.NewFotoVariacaoRepository(db),
		variacaoRepo: repository.NewVariacaoRepository(db),
		produtoRepo:  repository.NewProdutoRepository(db),
	}
}

// validarDono confere a cadeia loja → produto → variação inteira, não só
// se a variação existe — sem isso, o dono de uma loja poderia mexer na
// foto da variação de outra loja só sabendo o ID.
func (h *FotoVariacaoHandler) validarDono(lojaID, produtoID, variacaoID uint) bool {
	produto, err := h.produtoRepo.BuscarPorID(produtoID)
	if err != nil || produto.LojaID != lojaID {
		return false
	}
	variacao, err := h.variacaoRepo.BuscarPorID(variacaoID)
	if err != nil || variacao.ProdutoID != produtoID {
		return false
	}
	return true
}

func (h *FotoVariacaoHandler) Adicionar(c *gin.Context) {
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
	if !h.validarDono(lojaID, produtoID, variacaoID) {
		c.JSON(http.StatusForbidden, gin.H{"erro": "variação não encontrada"})
		return
	}

	var req struct {
		URL   string `json:"url" binding:"required"`
		Ordem int    `json:"ordem"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}

	foto := domain.FotoVariacao{
		VariacaoID: variacaoID,
		URL:        req.URL,
		Ordem:      req.Ordem,
	}
	if err := h.fotoRepo.Adicionar(&foto); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, foto)
}

func (h *FotoVariacaoHandler) Deletar(c *gin.Context) {
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
	fotoID, err := strconv.ParseUint(c.Param("fotoId"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "foto_id inválido"})
		return
	}
	if !h.validarDono(lojaID, produtoID, variacaoID) {
		c.JSON(http.StatusForbidden, gin.H{"erro": "variação não encontrada"})
		return
	}

	if err := h.fotoRepo.Deletar(uint(fotoID), variacaoID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}
