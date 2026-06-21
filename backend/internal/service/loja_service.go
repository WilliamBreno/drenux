package service

import (
	"github.com/WilliamBreno/cardapio-backend/internal/domain"
	"github.com/WilliamBreno/cardapio-backend/internal/repository"
	"gorm.io/gorm"
)

type LojaService struct {
	lojaRepo *repository.LojaRepository
}

func NewLojaService(db *gorm.DB) *LojaService {
	return &LojaService{lojaRepo: repository.NewLojaRepository(db)}
}

func (s *LojaService) Buscar(lojaID uint) (*domain.Loja, error) {
	return s.lojaRepo.BuscarPorID(lojaID)
}

func (s *LojaService) AtualizarConfiguracoes(lojaID uint, whatsappNumero string, permiteMesmoDia bool, logoURL string) error {
	return s.lojaRepo.AtualizarConfiguracoes(lojaID, whatsappNumero, permiteMesmoDia, logoURL)
}