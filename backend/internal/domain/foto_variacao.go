package domain

// FotoVariacao representa uma das fotos de uma variação de produto — usado
// no modo de preço "absoluto" (ver ModoPrecoVariacao), onde cada variação
// pode ter sua própria galeria em vez de compartilhar as fotos do produto.
type FotoVariacao struct {
	ID         uint   `gorm:"primaryKey" json:"id"`
	VariacaoID uint   `gorm:"not null;index" json:"variacao_id"`
	URL        string `gorm:"size:255;not null" json:"url"`
	Ordem      int    `gorm:"default:0" json:"ordem"`
}

func (FotoVariacao) TableName() string { return "fotos_variacao" }
