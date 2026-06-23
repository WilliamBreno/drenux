package repository

import (
	"github.com/WilliamBreno/cardapio-backend/internal/domain"
	"gorm.io/gorm"
)

type VariacaoRepository struct {
	db *gorm.DB
}

func NewVariacaoRepository(db *gorm.DB) *VariacaoRepository {
	return &VariacaoRepository{db: db}
}

func (r *VariacaoRepository) ListarPorProduto(produtoID uint) ([]domain.VariacaoProduto, error) {
	var variacoes []domain.VariacaoProduto
	if err := r.db.Where("produto_id = ?", produtoID).Order("ordem, id").Find(&variacoes).Error; err != nil {
		return nil, err
	}
	return variacoes, nil
}

func (r *VariacaoRepository) BuscarPorID(id uint) (*domain.VariacaoProduto, error) {
	var v domain.VariacaoProduto
	if err := r.db.First(&v, id).Error; err != nil {
		return nil, err
	}
	return &v, nil
}

func (r *VariacaoRepository) Criar(v *domain.VariacaoProduto) error {
	return r.db.Create(v).Error
}

func (r *VariacaoRepository) Atualizar(v *domain.VariacaoProduto) error {
	return r.db.Save(v).Error
}

func (r *VariacaoRepository) Deletar(id uint) error {
	return r.db.Delete(&domain.VariacaoProduto{}, id).Error
}

// BuscarEstoqueAlerta retorna a variação e true se o estoque atual
// atingiu ou ficou abaixo do limite de alerta.
func (r *VariacaoRepository) BuscarEstoqueAlerta(variacaoID uint) (*domain.VariacaoProduto, bool) {
	var v domain.VariacaoProduto
	if err := r.db.First(&v, variacaoID).Error; err != nil {
		return nil, false
	}
	if v.EstoqueAtual == nil || v.EstoqueAlerta == nil {
		return nil, false
	}
	return &v, *v.EstoqueAtual <= *v.EstoqueAlerta
}
// de forma atômica. Retorna o estoque restante, ou -1 se a variação não
// tem controle de estoque próprio.
func (r *VariacaoRepository) SubtrairEstoque(variacaoID uint, quantidade int) (int, error) {
	result := r.db.Model(&domain.VariacaoProduto{}).
		Where("id = ? AND estoque_atual IS NOT NULL", variacaoID).
		UpdateColumn("estoque_atual", gorm.Expr("GREATEST(estoque_atual - ?, 0)", quantidade))
	if result.Error != nil {
		return 0, result.Error
	}

	var v domain.VariacaoProduto
	if err := r.db.Select("estoque_atual, estoque_alerta").First(&v, variacaoID).Error; err != nil {
		return 0, err
	}
	if v.EstoqueAtual == nil {
		return -1, nil
	}

	if *v.EstoqueAtual == 0 {
		r.db.Model(&domain.VariacaoProduto{}).Where("id = ?", variacaoID).Update("disponivel", false)
	}

	return *v.EstoqueAtual, nil
}