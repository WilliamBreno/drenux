package service

import (
	"time"

	"gorm.io/gorm"
)

type ReceitaDia struct {
	Data  string  `json:"data"`
	Total float64 `json:"total"`
}

type ReceitaSemana struct {
	Semana string  `json:"semana"`
	Total  float64 `json:"total"`
}

type TopProduto struct {
	Nome       string `json:"nome"`
	Quantidade int    `json:"quantidade"`
}

type DashboardData struct {
	TotalSemana     float64         `json:"total_semana"`
	TotalMes        float64         `json:"total_mes"`
	PedidosSemana   int             `json:"pedidos_semana"`
	Receita7Dias    []ReceitaDia    `json:"receita_7_dias"`
	Receita4Semanas []ReceitaSemana `json:"receita_4_semanas"`
	TopProdutos     []TopProduto    `json:"top_produtos"`
}

type DashboardService struct {
	db *gorm.DB
}

func NewDashboardService(db *gorm.DB) *DashboardService {
	return &DashboardService{db: db}
}

func (s *DashboardService) BuscarDados(lojaID uint) (*DashboardData, error) {
	fusoBrasil, _ := time.LoadLocation("America/Sao_Paulo")
	agora := time.Now().In(fusoBrasil)

	inicioSemana := agora.AddDate(0, 0, -7)
	inicioMes := agora.AddDate(0, -1, 0)

	data := &DashboardData{}

	// Total da semana
	s.db.Raw(`SELECT COALESCE(SUM(total), 0) FROM pedidos
		WHERE loja_id = ? AND status = 'pago' AND updated_at >= ?`,
		lojaID, inicioSemana).Scan(&data.TotalSemana)

	// Total do mês
	s.db.Raw(`SELECT COALESCE(SUM(total), 0) FROM pedidos
		WHERE loja_id = ? AND status = 'pago' AND updated_at >= ?`,
		lojaID, inicioMes).Scan(&data.TotalMes)

	// Pedidos da semana
	s.db.Raw(`SELECT COUNT(*) FROM pedidos
		WHERE loja_id = ? AND status = 'pago' AND updated_at >= ?`,
		lojaID, inicioSemana).Scan(&data.PedidosSemana)

	// Receita por dia — últimos 7 dias, preenchendo dias sem pedido com 0
	var dias []ReceitaDia
	s.db.Raw(`
		SELECT
			TO_CHAR(d.dia, 'DD/MM') as data,
			COALESCE(SUM(p.total), 0) as total
		FROM generate_series(
			DATE_TRUNC('day', NOW() AT TIME ZONE 'America/Sao_Paulo' - INTERVAL '6 days'),
			DATE_TRUNC('day', NOW() AT TIME ZONE 'America/Sao_Paulo'),
			'1 day'::interval
		) d(dia)
		LEFT JOIN pedidos p ON
			DATE_TRUNC('day', p.updated_at AT TIME ZONE 'America/Sao_Paulo') = d.dia
			AND p.loja_id = ?
			AND p.status = 'pago'
		GROUP BY d.dia
		ORDER BY d.dia
	`, lojaID).Scan(&dias)
	data.Receita7Dias = dias

	// Receita por semana — últimas 4 semanas
	var semanas []ReceitaSemana
	s.db.Raw(`
		SELECT
			TO_CHAR(d.semana, 'DD/MM') as semana,
			COALESCE(SUM(p.total), 0) as total
		FROM generate_series(
			DATE_TRUNC('week', NOW() AT TIME ZONE 'America/Sao_Paulo' - INTERVAL '3 weeks'),
			DATE_TRUNC('week', NOW() AT TIME ZONE 'America/Sao_Paulo'),
			'1 week'::interval
		) d(semana)
		LEFT JOIN pedidos p ON
			DATE_TRUNC('week', p.updated_at AT TIME ZONE 'America/Sao_Paulo') = d.semana
			AND p.loja_id = ?
			AND p.status = 'pago'
		GROUP BY d.semana
		ORDER BY d.semana
	`, lojaID).Scan(&semanas)
	data.Receita4Semanas = semanas

	// Top 5 produtos mais vendidos (últimos 30 dias)
	var topProdutos []TopProduto
	s.db.Raw(`
		SELECT
			ip.produto_nome as nome,
			SUM(ip.quantidade) as quantidade
		FROM itens_pedido ip
		JOIN pedidos p ON p.id = ip.pedido_id
		WHERE p.loja_id = ? AND p.status = 'pago'
		AND p.updated_at >= NOW() - INTERVAL '30 days'
		GROUP BY ip.produto_nome
		ORDER BY quantidade DESC
		LIMIT 5
	`, lojaID).Scan(&topProdutos)
	data.TopProdutos = topProdutos

	return data, nil
}
