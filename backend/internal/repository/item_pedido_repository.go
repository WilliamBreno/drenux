package repository

import (
	"time"

	"github.com/WilliamBreno/cardapio-backend/internal/domain"
	"gorm.io/gorm"
)

type ItemPedidoRepository struct {
	db *gorm.DB
}

func NewItemPedidoRepository(db *gorm.DB) *ItemPedidoRepository {
	return &ItemPedidoRepository{db: db}
}

// ItemGuardado é um ItemPedido comprado no modo "guardar" que ainda não
// foi reivindicado por nenhuma SolicitacaoEntrega, com a data da compra
// original anexada (pra mostrar "guardado desde" pro cliente).
type ItemGuardado struct {
	domain.ItemPedido
	GuardadoDesde time.Time `json:"guardado_desde" gorm:"column:guardado_desde"`
}

// ListarGuardadosPorTelefone devolve os itens guardados e ainda
// disponíveis de um cliente numa loja — mesmo padrão de identificação por
// telefone já usado no histórico público.
func (r *ItemPedidoRepository) ListarGuardadosPorTelefone(lojaID uint, telefone string) ([]ItemGuardado, error) {
	var itens []ItemGuardado
	err := r.db.Table("itens_pedido").
		Select("itens_pedido.*, pedidos.created_at as guardado_desde").
		Joins("JOIN pedidos ON pedidos.id = itens_pedido.pedido_id").
		Where(
			"pedidos.loja_id = ? AND pedidos.cliente_telefone = ? AND pedidos.status = ? AND pedidos.modo_entrega = ? AND itens_pedido.solicitacao_entrega_id IS NULL",
			lojaID, telefone, domain.StatusPago, domain.ModoEntregaGuardar,
		).
		Order("itens_pedido.id desc").
		Find(&itens).Error
	return itens, err
}

// BuscarGuardadosPorIDs busca itens guardados específicos por ID,
// validando no mesmo WHERE que pertencem à loja, ao telefone informado e
// ainda estão disponíveis (ninguém reivindicou antes). Usado tanto na
// cotação de frete quanto na criação da solicitação de entrega — nunca
// confia em ownership vindo só do corpo da requisição.
func (r *ItemPedidoRepository) BuscarGuardadosPorIDs(lojaID uint, telefone string, ids []uint) ([]domain.ItemPedido, error) {
	var itens []domain.ItemPedido
	err := r.db.Model(&domain.ItemPedido{}).
		Joins("JOIN pedidos ON pedidos.id = itens_pedido.pedido_id").
		Where(
			"itens_pedido.id IN ? AND pedidos.loja_id = ? AND pedidos.cliente_telefone = ? AND pedidos.status = ? AND pedidos.modo_entrega = ? AND itens_pedido.solicitacao_entrega_id IS NULL",
			ids, lojaID, telefone, domain.StatusPago, domain.ModoEntregaGuardar,
		).
		Find(&itens).Error
	return itens, err
}

// MarcarComoReivindicados vincula os itens à solicitação de entrega que
// acabou de ser criada — a partir daqui eles somem da lista de guardados
// disponíveis. A condição "solicitacao_entrega_id IS NULL" no WHERE é o
// que garante atomicidade: se duas requisições tentarem reivindicar o
// mesmo item ao mesmo tempo, só uma consegue atualizar a linha — a outra
// recebe menos linhas afetadas do que pediu e o chamador deve tratar isso
// como conflito (fazer rollback da transação).
func (r *ItemPedidoRepository) MarcarComoReivindicados(itemIDs []uint, solicitacaoID uint) (int64, error) {
	resultado := r.db.Model(&domain.ItemPedido{}).
		Where("id IN ? AND solicitacao_entrega_id IS NULL", itemIDs).
		Update("solicitacao_entrega_id", solicitacaoID)
	return resultado.RowsAffected, resultado.Error
}
