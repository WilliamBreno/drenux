package service

import (
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"net/url"
	"strconv"
	"strings"
)

// DistanciaService cuida de duas coisas: transformar um endereço em texto
// em coordenadas (geocodificação) e calcular a distância entre dois pontos.
//
// Usamos o Nominatim (OpenStreetMap) para geocodificação — é gratuito e não
// exige chave de API, mas pede que respeitemos um limite informal de ~1
// requisição por segundo. Para o volume de um SaaS nessa fase, isso não é
// um problema.
type DistanciaService struct {
	httpClient *http.Client
}

func NewDistanciaService() *DistanciaService {
	return &DistanciaService{httpClient: &http.Client{}}
}

type Coordenada struct {
	Latitude  float64
	Longitude float64
}

type nominatimResultado struct {
	Lat     string            `json:"lat"`
	Lon     string            `json:"lon"`
	Address nominatimEndereco `json:"address"`
}

type nominatimEndereco struct {
	Cidade      string `json:"city"`
	Municipio   string `json:"municipality"`
	Vila        string `json:"village"`
	Cidadezinha string `json:"town"`
	Estado      string `json:"state"`
}

// GeocodificacaoDetalhada é o resultado de GeocodificarDetalhado — além das
// coordenadas, traz cidade/estado, usados pra decidir se um destino está na
// mesma região da loja ou fora dela.
type GeocodificacaoDetalhada struct {
	Coordenada
	Cidade string
	Estado string
}

// Geocodificar transforma um endereço em texto livre (ex: "Rua Tal 123,
// Aracaju, SE") em coordenadas de latitude/longitude. Retorna erro se o
// endereço não puder ser localizado.
func (s *DistanciaService) Geocodificar(endereco string) (*Coordenada, error) {
	resultado, err := s.geocodificarComFallback(endereco, false)
	if err != nil {
		return nil, err
	}
	return &resultado.Coordenada, nil
}

// GeocodificarDetalhado é igual a Geocodificar, mas também pede o
// detalhamento do endereço (bairro, cidade, estado) ao Nominatim — usado
// pra decidir se um destino de entrega está na mesma cidade/estado da loja
// (frete por km) ou fora dela (frete estimado por peso+distância).
func (s *DistanciaService) GeocodificarDetalhado(endereco string) (*GeocodificacaoDetalhada, error) {
	return s.geocodificarComFallback(endereco, true)
}

// geocodificarComFallback tenta o endereço completo primeiro. Se o
// Nominatim não encontrar nada — comum quando o número da casa ou o nome
// exato da rua não está mapeado no OpenStreetMap, o que acontece bastante
// em ruas menores no Brasil — tenta de novo removendo o trecho mais
// específico (rua/número), mantendo bairro/cidade/estado/CEP. Uma
// localização aproximada do bairro é muito melhor do que falhar
// completamente na hora de calcular frete. Funciona bem quando o endereço
// vem formatado como "rua, número - complemento, bairro, cidade - estado,
// cep" (é assim que o formulário de endereço do frontend monta o texto).
func (s *DistanciaService) geocodificarComFallback(endereco string, comEndereco bool) (*GeocodificacaoDetalhada, error) {
	resultado, err := s.buscarNominatim(endereco, comEndereco)
	if err == nil {
		return resultado, nil
	}

	partes := strings.Split(endereco, ",")
	for len(partes) > 1 {
		partes = partes[1:]
		tentativa := strings.TrimSpace(strings.Join(partes, ","))
		if tentativa == "" {
			break
		}
		if resultado, errTentativa := s.buscarNominatim(tentativa, comEndereco); errTentativa == nil {
			return resultado, nil
		}
	}

	return nil, err
}

func (s *DistanciaService) buscarNominatim(endereco string, comEndereco bool) (*GeocodificacaoDetalhada, error) {
	baseURL := "https://nominatim.openstreetmap.org/search"
	params := url.Values{}
	params.Set("q", endereco)
	params.Set("format", "json")
	params.Set("limit", "1")
	params.Set("countrycodes", "br")
	if comEndereco {
		params.Set("addressdetails", "1")
	}

	req, err := http.NewRequest("GET", baseURL+"?"+params.Encode(), nil)
	if err != nil {
		return nil, fmt.Errorf("montando requisição de geocodificação: %w", err)
	}
	req.Header.Set("User-Agent", "Drenux/1.0 (contato: williamdevpy@gmail.com)")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("chamando Nominatim: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Nominatim retornou status %d", resp.StatusCode)
	}

	var resultados []nominatimResultado
	if err := json.NewDecoder(resp.Body).Decode(&resultados); err != nil {
		return nil, fmt.Errorf("lendo resposta do Nominatim: %w", err)
	}

	if len(resultados) == 0 {
		return nil, fmt.Errorf("endereço não encontrado: %s", endereco)
	}

	lat, err := strconv.ParseFloat(resultados[0].Lat, 64)
	if err != nil {
		return nil, fmt.Errorf("interpretando latitude: %w", err)
	}
	lon, err := strconv.ParseFloat(resultados[0].Lon, 64)
	if err != nil {
		return nil, fmt.Errorf("interpretando longitude: %w", err)
	}

	endr := resultados[0].Address
	cidade := endr.Cidade
	if cidade == "" {
		cidade = endr.Municipio
	}
	if cidade == "" {
		cidade = endr.Cidadezinha
	}
	if cidade == "" {
		cidade = endr.Vila
	}

	return &GeocodificacaoDetalhada{
		Coordenada: Coordenada{Latitude: lat, Longitude: lon},
		Cidade:     cidade,
		Estado:     endr.Estado,
	}, nil
}

// DistanciaKm calcula a distância em linha reta (fórmula de Haversine)
// entre dois pontos, em quilômetros.
func (s *DistanciaService) DistanciaKm(origem, destino Coordenada) float64 {
	const raioTerraKm = 6371.0

	lat1 := origem.Latitude * math.Pi / 180
	lat2 := destino.Latitude * math.Pi / 180
	deltaLat := (destino.Latitude - origem.Latitude) * math.Pi / 180
	deltaLon := (destino.Longitude - origem.Longitude) * math.Pi / 180

	a := math.Sin(deltaLat/2)*math.Sin(deltaLat/2) +
		math.Cos(lat1)*math.Cos(lat2)*math.Sin(deltaLon/2)*math.Sin(deltaLon/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return raioTerraKm * c
}

// CalcularTaxaPorKm aplica a fórmula "taxa base + (distância × valor por km)".
func CalcularTaxaPorKm(distanciaKm, taxaBase, taxaPorKm float64) float64 {
	return taxaBase + (distanciaKm * taxaPorKm)
}

// Constantes da estimativa de frete fora da região da loja — uma
// aproximação inspirada nas faixas de peso do PAC/SEDEX, não uma
// integração real com os Correios (que exige contrato empresarial). São
// valores de partida, ajustáveis livremente conforme o custo real
// observado.
const (
	freteCorreiosBase300g   = 18.0
	freteCorreiosBase1kg    = 25.0
	freteCorreiosBase5kg    = 40.0
	freteCorreiosBase10kg   = 60.0
	freteCorreiosPorKgExtra = 6.0
	freteCorreiosPorKm      = 0.06
	freteCorreiosMinimo     = 20.0
)

// CalcularFreteEstimadoCorreios estima o frete de itens guardados quando o
// destino fica fora da cidade/estado da loja, combinando uma faixa de peso
// com uma tarifa por distância.
func CalcularFreteEstimadoCorreios(pesoGramas int, distanciaKm float64) float64 {
	var base float64
	switch {
	case pesoGramas <= 300:
		base = freteCorreiosBase300g
	case pesoGramas <= 1000:
		base = freteCorreiosBase1kg
	case pesoGramas <= 5000:
		base = freteCorreiosBase5kg
	case pesoGramas <= 10000:
		base = freteCorreiosBase10kg
	default:
		kgExtra := math.Ceil(float64(pesoGramas-10000) / 1000)
		base = freteCorreiosBase10kg + kgExtra*freteCorreiosPorKgExtra
	}

	total := base + distanciaKm*freteCorreiosPorKm
	if total < freteCorreiosMinimo {
		total = freteCorreiosMinimo
	}
	return total
}
