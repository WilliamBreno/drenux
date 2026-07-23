package service

import (
	"errors"
	"fmt"
	"time"
	_ "time/tzdata"

	"github.com/WilliamBreno/cardapio-backend/internal/domain"
	"github.com/WilliamBreno/cardapio-backend/internal/repository"
	"gorm.io/gorm"
)

type ItemPedidoInput struct {
	ProdutoID  uint
	VariacaoID *uint
	Quantidade int
}

type PedidoInput struct {
	ClienteNome     string
	ClienteTelefone string
	DataRetirada    time.Time
	ModoEntrega     string
	EnderecoEntrega string
	CupomCodigo     string
	Itens           []ItemPedidoInput
}

type PedidoService struct {
	db               *gorm.DB
	lojaRepo         *repository.LojaRepository
	pedidoRepo       *repository.PedidoRepository
	cupomRepo        *repository.CupomRepository
	distanciaService *DistanciaService
}

func NewPedidoService(db *gorm.DB, distanciaService *DistanciaService) *PedidoService {
	return &PedidoService{
		db:               db,
		lojaRepo:         repository.NewLojaRepository(db),
		pedidoRepo:       repository.NewPedidoRepository(db),
		cupomRepo:        repository.NewCupomRepository(db),
		distanciaService: distanciaService,
	}
}

func (s *PedidoService) CriarPorSlug(slug string, input PedidoInput) (*domain.Pedido, error) {
	loja, err := s.lojaRepo.BuscarPorSlug(slug)
	if err != nil {
		return nil, errors.New("loja não encontrada")
	}

	if len(input.Itens) == 0 {
		return nil, errors.New("o pedido precisa ter pelo menos um item")
	}

	// Valida modo de entrega
	modoEntrega := domain.ModoEntregaRetirada
	switch input.ModoEntrega {
	case string(domain.ModoEntregaEntrega):
		if !loja.AceitaEntrega {
			return nil, errors.New("essa loja não aceita entrega em domicílio")
		}
		if input.EnderecoEntrega == "" {
			return nil, errors.New("endereço de entrega é obrigatório")
		}
		modoEntrega = domain.ModoEntregaEntrega

	case string(domain.ModoEntregaGuardar):
		if !loja.AceitaGuardarEntregar {
			return nil, errors.New("essa loja não aceita guardar itens pra entregar depois")
		}
		modoEntrega = domain.ModoEntregaGuardar

	default:
		if !loja.AceitaRetirada {
			return nil, errors.New("essa loja não aceita retirada — só entrega em domicílio")
		}
	}

	// Validações da loja antes de aceitar o pedido
	if err := validarLojaAberta(loja); err != nil {
		return nil, err
	}
	// Pedidos "guardar" não têm data de retirada — os itens ficam
	// guardados por tempo indeterminado até o cliente pedir a entrega.
	if modoEntrega != domain.ModoEntregaGuardar {
		if err := validarDataRetirada(input.DataRetirada, loja); err != nil {
			return nil, err
		}
	}

	// Calcula a taxa de entrega ANTES da transação — se for "por_km" e a
	// geocodificação falhar, queremos rejeitar o pedido com uma mensagem
	// clara, sem nem chegar a mexer no banco. Esse valor é a fonte de
	// verdade cobrada de verdade; qualquer cotação mostrada antes no
	// carrinho do cliente foi só uma prévia, nunca confiável sozinha.
	var taxaEntrega float64
	if modoEntrega == domain.ModoEntregaEntrega {
		switch loja.TaxaEntregaTipo {
		case "fixa":
			taxaEntrega = loja.TaxaEntregaValor

		case "por_km":
			if loja.Latitude == 0 && loja.Longitude == 0 {
				return nil, errors.New("essa loja ainda não configurou o endereço de origem pra calcular o frete")
			}
			if s.distanciaService == nil {
				return nil, errors.New("cálculo de frete indisponível no momento")
			}
			destino, err := s.distanciaService.Geocodificar(input.EnderecoEntrega)
			if err != nil {
				return nil, errors.New("não conseguimos localizar o endereço de entrega informado — confere se está completo")
			}
			origem := Coordenada{Latitude: loja.Latitude, Longitude: loja.Longitude}
			distancia := s.distanciaService.DistanciaKm(origem, *destino)
			taxaEntrega = CalcularTaxaPorKm(distancia, loja.TaxaEntregaBase, loja.TaxaEntregaPorKm)

		case "combinado":
			taxaEntrega = 0 // combinado fora do sistema, não entra no total cobrado agora
		}
	}

	pedido := domain.Pedido{
		LojaID:          loja.ID,
		ClienteNome:     input.ClienteNome,
		ClienteTelefone: input.ClienteTelefone,
		DataRetirada:    input.DataRetirada,
		Status:          domain.StatusAguardandoPagamento,
		ModoEntrega:     modoEntrega,
		EnderecoEntrega: input.EnderecoEntrega,
		TaxaEntrega:     taxaEntrega,
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		produtoRepo := repository.NewProdutoRepository(tx)
		pedidoRepo := repository.NewPedidoRepository(tx)
		variacaoRepo := repository.NewVariacaoRepository(tx)

		var total float64
		itens := make([]domain.ItemPedido, 0, len(input.Itens))

		for _, itemInput := range input.Itens {
			if itemInput.Quantidade <= 0 {
				return fmt.Errorf("quantidade inválida pro produto %d", itemInput.ProdutoID)
			}

			produto, err := produtoRepo.BuscarPorID(itemInput.ProdutoID)
			if err != nil {
				return fmt.Errorf("produto %d não encontrado", itemInput.ProdutoID)
			}
			if produto.LojaID != loja.ID {
				return fmt.Errorf("produto %d não pertence a essa loja", itemInput.ProdutoID)
			}
			if !produto.Disponivel {
				return fmt.Errorf("produto %q está indisponível no momento", produto.Nome)
			}
			if modoEntrega == domain.ModoEntregaGuardar && produto.TipoProduto != domain.TipoProdutoMercadoria {
				return fmt.Errorf("produto %q é alimentício e não pode ser guardado pra entrega posterior", produto.Nome)
			}

			precoUnit := produto.Preco
			variacaoNome := ""

			// Escolher uma variação é opcional pro cliente, mesmo quando o
			// produto tem variações cadastradas — sem variação escolhida,
			// usa o preço/estoque base do próprio produto (mesmo caminho
			// de quem nunca teve variação nenhuma).
			if itemInput.VariacaoID != nil {
				variacao, err := variacaoRepo.BuscarPorID(*itemInput.VariacaoID)
				if err != nil || variacao.ProdutoID != produto.ID {
					return fmt.Errorf("variação inválida pro produto %q", produto.Nome)
				}
				if !variacao.Disponivel {
					return fmt.Errorf("variação %q do produto %q está indisponível", variacao.Nome, produto.Nome)
				}
				if variacao.EstoqueAtual != nil && *variacao.EstoqueAtual < itemInput.Quantidade {
					if *variacao.EstoqueAtual == 0 {
						return fmt.Errorf("variação %q do produto %q está esgotada", variacao.Nome, produto.Nome)
					}
					return fmt.Errorf("variação %q tem apenas %d unidade(s) disponível(is)", variacao.Nome, *variacao.EstoqueAtual)
				}
				if variacao.ModoPreco == domain.ModoPrecoAbsoluto {
					precoUnit = variacao.PrecoAdicional
				} else {
					precoUnit += variacao.PrecoAdicional
				}
				variacaoNome = variacao.Nome
			} else {
				if produto.EstoqueAtual != nil && *produto.EstoqueAtual < itemInput.Quantidade {
					if *produto.EstoqueAtual == 0 {
						return fmt.Errorf("produto %q está esgotado", produto.Nome)
					}
					return fmt.Errorf("produto %q tem apenas %d unidade(s) disponível(is)", produto.Nome, *produto.EstoqueAtual)
				}
			}

			subtotal := precoUnit * float64(itemInput.Quantidade)
			total += subtotal

			pesoGramas := 0
			if produto.PesoGramas != nil {
				pesoGramas = *produto.PesoGramas
			}

			itens = append(itens, domain.ItemPedido{
				ProdutoID:    produto.ID,
				ProdutoNome:  produto.Nome,
				Quantidade:   itemInput.Quantidade,
				PrecoUnit:    precoUnit,
				VariacaoID:   itemInput.VariacaoID,
				VariacaoNome: variacaoNome,
				TipoProduto:  produto.TipoProduto,
				PesoGramas:   pesoGramas,
			})
		}

		pedido.Total = total + taxaEntrega

		// Valida valor mínimo de pedido (sobre o subtotal, sem taxa de entrega)
		if loja.ValorMinimoPedido > 0 && total < loja.ValorMinimoPedido {
			return fmt.Errorf(
				"pedido mínimo de R$ %.2f — seu carrinho está com R$ %.2f",
				loja.ValorMinimoPedido, total,
			)
		}

		// Aplica cupom de desconto, se informado
		if input.CupomCodigo != "" {
			cupomRepo := repository.NewCupomRepository(tx)
			cupom, err := cupomRepo.BuscarPorCodigo(input.CupomCodigo, loja.ID)
			if err != nil {
				return errors.New("cupom não encontrado")
			}
			if !cupom.Ativo {
				return errors.New("esse cupom não está mais ativo")
			}
			if cupom.Validade != nil && time.Now().After(*cupom.Validade) {
				return errors.New("esse cupom expirou")
			}
			if cupom.UsoMaximo != nil && cupom.UsoAtual >= *cupom.UsoMaximo {
				return errors.New("esse cupom atingiu o limite de usos")
			}
			if cupom.ValorMinimoPedido > 0 && total < cupom.ValorMinimoPedido {
				return fmt.Errorf("pedido mínimo de R$ %.2f pra usar esse cupom", cupom.ValorMinimoPedido)
			}

			var desconto float64
			if cupom.Tipo == domain.TipoCupomPercentual {
				desconto = total * cupom.Valor / 100
			} else {
				desconto = cupom.Valor
			}
			if desconto > total {
				desconto = total
			}

			pedido.CupomCodigo = cupom.Codigo
			pedido.Desconto = desconto
			pedido.Total -= desconto
			if pedido.Total < 0 {
				pedido.Total = 0
			}

			if err := cupomRepo.IncrementarUso(cupom.ID); err != nil {
				return fmt.Errorf("erro ao registrar uso do cupom: %w", err)
			}
		}

		pedido.Itens = itens

		if err := pedidoRepo.Criar(&pedido); err != nil {
			return fmt.Errorf("criando pedido: %w", err)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return &pedido, nil
}

func (s *PedidoService) ListarPorLoja(lojaID uint) ([]domain.Pedido, error) {
	return s.pedidoRepo.ListarPorLoja(lojaID)
}

// validarLojaAberta verifica se a loja está aceitando pedidos agora —
// checa pausa manual, horário de funcionamento e margem de fechamento.
func validarLojaAberta(loja *domain.Loja) error {
	if loja.Pausado {
		msg := "loja temporariamente fechada"
		if loja.MensagemPausa != "" {
			msg = loja.MensagemPausa
		}
		return errors.New(msg)
	}

	if loja.HorarioAbertura == "" || loja.HorarioFechamento == "" {
		return nil
	}

	fusoBrasil, err := time.LoadLocation("America/Sao_Paulo")
	if err != nil {
		fusoBrasil = time.UTC
	}

	agora := time.Now().In(fusoBrasil)
	agoraStr := agora.Format("15:04")

	fechamento := loja.HorarioFechamento
	if loja.MargemFechamentoMinutos > 0 {
		t, err := time.Parse("15:04", loja.HorarioFechamento)
		if err == nil {
			t = t.Add(-time.Duration(loja.MargemFechamentoMinutos) * time.Minute)
			fechamento = t.Format("15:04")
		}
	}

	if agoraStr < loja.HorarioAbertura || agoraStr >= fechamento {
		return fmt.Errorf("loja fechada — funcionamos das %s às %s", loja.HorarioAbertura, loja.HorarioFechamento)
	}

	return nil
}

// validarDataRetirada aplica as regras do modo de pedido da loja.
func validarDataRetirada(dataRetirada time.Time, loja *domain.Loja) error {
	fusoBrasil, err := time.LoadLocation("America/Sao_Paulo")
	if err != nil {
		fusoBrasil = time.UTC
	}

	agora := time.Now().In(fusoBrasil)

	if loja.ModoPedido == domain.ModoPedidoImediato {
		if dataRetirada.Before(agora.Add(-1 * time.Minute)) {
			return errors.New("data de retirada não pode ser no passado")
		}
		return nil
	}

	minimoHoras := loja.AntecedenciaMinimaHoras
	if minimoHoras <= 0 {
		minimoHoras = 1
	}
	minimo := agora.Add(time.Duration(minimoHoras) * time.Hour)

	if dataRetirada.Before(minimo) {
		return fmt.Errorf("essa loja exige pelo menos %d hora(s) de antecedência pra fazer um pedido", minimoHoras)
	}

	return nil
}
