package repository

import (
	"time"

	"github.com/WilliamBreno/cardapio-backend/internal/domain"
	"gorm.io/gorm"
)

type SolicitacaoEntregaRepository struct {
	db *gorm.DB
}

func NewSolicitacaoEntregaRepository(db *gorm.DB) *SolicitacaoEntregaRepository {
	return &SolicitacaoEntregaRepository{db: db}
}

func (r *SolicitacaoEntregaRepository) Criar(solicitacao *domain.SolicitacaoEntrega) error {
	return r.db.Create(solicitacao).Error
}

func (r *SolicitacaoEntregaRepository) BuscarPorID(id uint) (*domain.SolicitacaoEntrega, error) {
	var solicitacao domain.SolicitacaoEntrega
	if err := r.db.Preload("Itens").First(&solicitacao, id).Error; err != nil {
		return nil, err
	}
	return &solicitacao, nil
}

// BuscarPorIDETelefone é usado pelo rastreamento público — mesmo padrão
// de "telefone como senha simples" já usado em Pedido.
func (r *SolicitacaoEntregaRepository) BuscarPorIDETelefone(id uint, telefone string) (*domain.SolicitacaoEntrega, error) {
	var solicitacao domain.SolicitacaoEntrega
	if err := r.db.Where("id = ? AND cliente_telefone = ?", id, telefone).
		Preload("Itens").First(&solicitacao).Error; err != nil {
		return nil, err
	}
	return &solicitacao, nil
}

// ListarPagasPorLoja devolve as solicitações de entrega já pagas de uma
// loja, mais recentes primeiro — é o que alimenta a fila de envio do
// admin.
func (r *SolicitacaoEntregaRepository) ListarPagasPorLoja(lojaID uint) ([]domain.SolicitacaoEntrega, error) {
	var solicitacoes []domain.SolicitacaoEntrega
	err := r.db.
		Where("loja_id = ? AND status = ?", lojaID, domain.StatusSolicitacaoPaga).
		Preload("Itens").
		Order("id desc").
		Find(&solicitacoes).Error
	return solicitacoes, err
}

func (r *SolicitacaoEntregaRepository) AtualizarStatus(id uint, status domain.StatusSolicitacao) error {
	return r.db.Model(&domain.SolicitacaoEntrega{}).Where("id = ?", id).Update("status", status).Error
}

func (r *SolicitacaoEntregaRepository) AtualizarStripeSessionID(id uint, sessionID string) error {
	return r.db.Model(&domain.SolicitacaoEntrega{}).Where("id = ?", id).Update("stripe_session_id", sessionID).Error
}

func (r *SolicitacaoEntregaRepository) AtualizarStatusEntrega(id uint, statusEntrega string) error {
	return r.db.Model(&domain.SolicitacaoEntrega{}).Where("id = ?", id).Update("status_entrega", statusEntrega).Error
}

func (r *SolicitacaoEntregaRepository) AtualizarLocalizacaoEntregador(id uint, latitude, longitude float64) error {
	agora := time.Now()
	return r.db.Model(&domain.SolicitacaoEntrega{}).Where("id = ?", id).Updates(map[string]interface{}{
		"entregador_latitude":      latitude,
		"entregador_longitude":     longitude,
		"entregador_atualizado_em": agora,
	}).Error
}
