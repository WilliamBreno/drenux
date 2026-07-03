package service

import (
	"errors"
	"fmt"
	"math"
	"time"

	"github.com/WilliamBreno/cardapio-backend/internal/domain"
	"github.com/WilliamBreno/cardapio-backend/internal/repository"
	"gorm.io/gorm"
)

type CupomInput struct {
	Codigo            string
	Tipo              string
	Valor             float64
	Ativo             bool
	UsoMaximo         *int
	Validade          *time.Time
	ValorMinimoPedido float64
}

type ResultadoValidacao struct {
	Cupom    *domain.Cupom
	Desconto float64
}

type CupomService struct {
	cupomRepo *repository.CupomRepository
}

func NewCupomService(db *gorm.DB) *CupomService {
	return &CupomService{cupomRepo: repository.NewCupomRepository(db)}
}

// Validar verifica se um cupom é aplicável pra um determinado subtotal.
// Retorna o cupom e o valor do desconto se válido, ou erro descritivo.
func (s *CupomService) Validar(codigo string, lojaID uint, subtotal float64) (*ResultadoValidacao, error) {
	cupom, err := s.cupomRepo.BuscarPorCodigo(codigo, lojaID)
	if err != nil {
		return nil, errors.New("cupom não encontrado")
	}
	if !cupom.Ativo {
		return nil, errors.New("esse cupom não está mais ativo")
	}
	if cupom.Validade != nil && time.Now().After(*cupom.Validade) {
		return nil, errors.New("esse cupom expirou")
	}
	if cupom.UsoMaximo != nil && cupom.UsoAtual >= *cupom.UsoMaximo {
		return nil, errors.New("esse cupom atingiu o limite de usos")
	}
	if cupom.ValorMinimoPedido > 0 && subtotal < cupom.ValorMinimoPedido {
		return nil, fmt.Errorf(
			"pedido mínimo de R$ %.2f pra usar esse cupom", cupom.ValorMinimoPedido,
		)
	}

	desconto := calcularDesconto(cupom, subtotal)
	return &ResultadoValidacao{Cupom: cupom, Desconto: desconto}, nil
}

// Listar retorna todos os cupons de uma loja.
func (s *CupomService) Listar(lojaID uint) ([]domain.Cupom, error) {
	return s.cupomRepo.ListarPorLoja(lojaID)
}

// Criar valida os dados e cria um novo cupom.
func (s *CupomService) Criar(lojaID uint, input CupomInput) (*domain.Cupom, error) {
	if err := validarInput(input); err != nil {
		return nil, err
	}

	cupom := domain.Cupom{
		LojaID:            lojaID,
		Codigo:            input.Codigo,
		Tipo:              domain.TipoCupom(input.Tipo),
		Valor:             input.Valor,
		Ativo:             input.Ativo,
		UsoMaximo:         input.UsoMaximo,
		Validade:          input.Validade,
		ValorMinimoPedido: input.ValorMinimoPedido,
	}

	if err := s.cupomRepo.Criar(&cupom); err != nil {
		return nil, errors.New("não foi possível criar o cupom — o código pode já estar em uso")
	}
	return &cupom, nil
}

// Atualizar atualiza um cupom existente.
func (s *CupomService) Atualizar(id, lojaID uint, input CupomInput) (*domain.Cupom, error) {
	cupom, err := s.cupomRepo.BuscarPorID(id, lojaID)
	if err != nil {
		return nil, errors.New("cupom não encontrado")
	}
	if err := validarInput(input); err != nil {
		return nil, err
	}

	cupom.Codigo = input.Codigo
	cupom.Tipo = domain.TipoCupom(input.Tipo)
	cupom.Valor = input.Valor
	cupom.Ativo = input.Ativo
	cupom.UsoMaximo = input.UsoMaximo
	cupom.Validade = input.Validade
	cupom.ValorMinimoPedido = input.ValorMinimoPedido

	if err := s.cupomRepo.Atualizar(cupom); err != nil {
		return nil, errors.New("não foi possível salvar")
	}
	return cupom, nil
}

// Deletar remove um cupom da loja.
func (s *CupomService) Deletar(id, lojaID uint) error {
	return s.cupomRepo.Deletar(id, lojaID)
}

// IncrementarUso é chamado pelo webhook após pagamento confirmado.
func (s *CupomService) IncrementarUso(cupomID uint) error {
	return s.cupomRepo.IncrementarUso(cupomID)
}

func calcularDesconto(cupom *domain.Cupom, subtotal float64) float64 {
	var desconto float64
	switch cupom.Tipo {
	case domain.TipoCupomPercentual:
		desconto = math.Round(subtotal*cupom.Valor/100*100) / 100
	case domain.TipoCupomFixo:
		desconto = cupom.Valor
	}
	// Desconto não pode ser maior que o subtotal
	if desconto > subtotal {
		desconto = subtotal
	}
	return desconto
}

func validarInput(input CupomInput) error {
	if input.Codigo == "" {
		return errors.New("código do cupom é obrigatório")
	}
	if input.Tipo != string(domain.TipoCupomPercentual) && input.Tipo != string(domain.TipoCupomFixo) {
		return errors.New("tipo deve ser 'percentual' ou 'fixo'")
	}
	if input.Valor <= 0 {
		return errors.New("valor do desconto deve ser maior que zero")
	}
	if input.Tipo == string(domain.TipoCupomPercentual) && input.Valor > 100 {
		return errors.New("desconto percentual não pode ultrapassar 100%")
	}
	return nil
}
