package service

import (
	"errors"
	"fmt"

	"github.com/WilliamBreno/cardapio-backend/internal/domain"
	"github.com/WilliamBreno/cardapio-backend/internal/repository"
	"gorm.io/gorm"
)

type ProdutoInput struct {
	Nome          string
	Descricao     string
	Preco         float64
	FotoURL       string
	Disponivel    bool
	CategoriaID   uint
	EstoqueAtual  *int
	EstoqueAlerta *int
	TipoProduto   domain.TipoProduto
	PesoGramas    *int

	// SubcategoriaID/GrupoCorID são opcionais e exclusivos do segmento
	// "mercadoria" — ver domain.Produto.
	SubcategoriaID *uint
	GrupoCorID     *uint
}

type ProdutoService struct {
	produtoRepo      *repository.ProdutoRepository
	categoriaRepo    *repository.CategoriaRepository
	subcategoriaRepo *repository.SubcategoriaRepository
	grupoCorRepo     *repository.GrupoCorRepository
}

func NewProdutoService(db *gorm.DB) *ProdutoService {
	return &ProdutoService{
		produtoRepo:      repository.NewProdutoRepository(db),
		categoriaRepo:    repository.NewCategoriaRepository(db),
		subcategoriaRepo: repository.NewSubcategoriaRepository(db),
		grupoCorRepo:     repository.NewGrupoCorRepository(db),
	}
}

// Listar devolve todos os produtos da loja, inclusive os pausados — o
// dono precisa ver tudo pra poder reativar um item.
func (s *ProdutoService) Listar(lojaID uint) ([]domain.Produto, error) {
	return s.produtoRepo.ListarPorLoja(lojaID, false)
}

func (s *ProdutoService) Criar(lojaID uint, input ProdutoInput) (*domain.Produto, error) {
	if err := s.validarCategoriaDaLoja(lojaID, input.CategoriaID); err != nil {
		return nil, err
	}
	tipo, peso, err := validarTipoEPeso(input.TipoProduto, input.PesoGramas)
	if err != nil {
		return nil, err
	}
	subcategoriaID, grupoCorID, err := s.validarSubcategoriaEGrupo(input.CategoriaID, input.SubcategoriaID, input.GrupoCorID)
	if err != nil {
		return nil, err
	}

	produto := domain.Produto{
		LojaID:         lojaID,
		CategoriaID:    input.CategoriaID,
		SubcategoriaID: subcategoriaID,
		GrupoCorID:     grupoCorID,
		Nome:           input.Nome,
		Descricao:      input.Descricao,
		Preco:          input.Preco,
		FotoURL:        input.FotoURL,
		Disponivel:     input.Disponivel,
		EstoqueAtual:   input.EstoqueAtual,
		EstoqueAlerta:  input.EstoqueAlerta,
		TipoProduto:    tipo,
		PesoGramas:     peso,
	}
	if err := s.produtoRepo.Criar(&produto); err != nil {
		return nil, fmt.Errorf("criando produto: %w", err)
	}

	// Recarrega com a Categoria já preenchida — o struct que acabamos de
	// salvar só tem o CategoriaID, não os dados completos da categoria.
	return s.produtoRepo.BuscarPorID(produto.ID)
}

func (s *ProdutoService) Atualizar(lojaID, produtoID uint, input ProdutoInput) (*domain.Produto, error) {
	produto, err := s.buscarDaLoja(lojaID, produtoID)
	if err != nil {
		return nil, err
	}

	if err := s.validarCategoriaDaLoja(lojaID, input.CategoriaID); err != nil {
		return nil, err
	}
	tipo, peso, err := validarTipoEPeso(input.TipoProduto, input.PesoGramas)
	if err != nil {
		return nil, err
	}
	subcategoriaID, grupoCorID, err := s.validarSubcategoriaEGrupo(input.CategoriaID, input.SubcategoriaID, input.GrupoCorID)
	if err != nil {
		return nil, err
	}

	produto.Nome = input.Nome
	produto.Descricao = input.Descricao
	produto.Preco = input.Preco
	produto.FotoURL = input.FotoURL
	produto.Disponivel = input.Disponivel
	produto.CategoriaID = input.CategoriaID
	produto.SubcategoriaID = subcategoriaID
	produto.GrupoCorID = grupoCorID
	produto.EstoqueAtual = input.EstoqueAtual
	produto.EstoqueAlerta = input.EstoqueAlerta
	produto.TipoProduto = tipo
	produto.PesoGramas = peso

	if err := s.produtoRepo.Atualizar(produto); err != nil {
		return nil, fmt.Errorf("atualizando produto: %w", err)
	}

	// Recarrega: se a categoria mudou nessa atualização, o struct
	// Categoria que já estava em memória (carregado antes da mudança)
	// ainda apontaria pros dados da categoria antiga.
	return s.produtoRepo.BuscarPorID(produto.ID)
}

func (s *ProdutoService) Deletar(lojaID, produtoID uint) error {
	produto, err := s.buscarDaLoja(lojaID, produtoID)
	if err != nil {
		return err
	}
	return s.produtoRepo.Deletar(produto.ID)
}

func (s *ProdutoService) buscarDaLoja(lojaID, produtoID uint) (*domain.Produto, error) {
	produto, err := s.produtoRepo.BuscarPorID(produtoID)
	if err != nil {
		return nil, errors.New("produto não encontrado")
	}
	if produto.LojaID != lojaID {
		return nil, errors.New("produto não pertence a essa loja")
	}
	return produto, nil
}

// validarTipoEPeso valida o tipo do produto e normaliza o peso. Peso NÃO é
// mais obrigatório pra "mercadoria" — só é usado, se existir, pra estimar
// o frete quando o destino de uma entrega de itens guardados fica fora da
// região da loja (ver GuardadosService.calcularFrete). Um produto
// mercadoria sem peso continua sendo cadastrado normalmente; a Solicitação
// de entrega correspondente é que fica marcada como "peso pendente" na
// hora em que o frete interestadual precisar desse dado e ele não
// existir (ver domain.SolicitacaoEntrega.PesoPendente). Produtos
// alimentícios não usam peso, então o valor recebido é ignorado.
func validarTipoEPeso(tipo domain.TipoProduto, pesoGramas *int) (domain.TipoProduto, *int, error) {
	if tipo == "" {
		tipo = domain.TipoProdutoAlimenticio
	}
	if tipo != domain.TipoProdutoAlimenticio && tipo != domain.TipoProdutoMercadoria {
		return "", nil, errors.New("tipo de produto inválido")
	}
	if tipo == domain.TipoProdutoAlimenticio {
		return tipo, nil, nil
	}
	if pesoGramas != nil && *pesoGramas <= 0 {
		pesoGramas = nil
	}
	return tipo, pesoGramas, nil
}

// validarCategoriaDaLoja impede que um produto seja associado a uma
// categoria de outra loja — mesmo que alguém descubra o ID por fora.
func (s *ProdutoService) validarCategoriaDaLoja(lojaID, categoriaID uint) error {
	categoria, err := s.categoriaRepo.BuscarPorID(categoriaID)
	if err != nil {
		return errors.New("categoria não encontrada")
	}
	if categoria.LojaID != lojaID {
		return errors.New("categoria não pertence a essa loja")
	}
	return nil
}

// validarSubcategoriaEGrupo confere a cadeia Categoria → Subcategoria →
// Grupo de Cor: a subcategoria (se informada) precisa pertencer à mesma
// categoria do produto (que por sua vez já foi validada como sendo da
// loja em validarCategoriaDaLoja), e o grupo de cor (se informado)
// precisa pertencer à subcategoria informada — grupo de cor nunca existe
// sem subcategoria.
func (s *ProdutoService) validarSubcategoriaEGrupo(categoriaID uint, subcategoriaID, grupoCorID *uint) (*uint, *uint, error) {
	if subcategoriaID == nil {
		if grupoCorID != nil {
			return nil, nil, errors.New("grupo de cor exige uma subcategoria")
		}
		return nil, nil, nil
	}

	subcategoria, err := s.subcategoriaRepo.BuscarPorID(*subcategoriaID)
	if err != nil || subcategoria.CategoriaID != categoriaID {
		return nil, nil, errors.New("subcategoria não pertence à categoria escolhida")
	}

	if grupoCorID == nil {
		return subcategoriaID, nil, nil
	}

	grupoCor, err := s.grupoCorRepo.BuscarPorID(*grupoCorID)
	if err != nil || grupoCor.SubcategoriaID != *subcategoriaID {
		return nil, nil, errors.New("grupo de cor não pertence à subcategoria escolhida")
	}

	return subcategoriaID, grupoCorID, nil
}
