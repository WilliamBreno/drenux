package service

import (
	"regexp"
	"strings"
)

// acentosReplacer troca os acentos comuns do português por suas versões
// sem acento. Cobre o suficiente sem precisar de uma dependência externa
// só pra isso.
var acentosReplacer = strings.NewReplacer(
	"á", "a", "à", "a", "ã", "a", "â", "a", "ä", "a",
	"é", "e", "è", "e", "ê", "e", "ë", "e",
	"í", "i", "ì", "i", "î", "i", "ï", "i",
	"ó", "o", "ò", "o", "õ", "o", "ô", "o", "ö", "o",
	"ú", "u", "ù", "u", "û", "u", "ü", "u",
	"ç", "c", "ñ", "n",
)

var caracteresInvalidos = regexp.MustCompile(`[^a-z0-9]+`)

// gerarSlug transforma "Padaria da Maria" em "padaria-da-maria".
func gerarSlug(nome string) string {
	slug := strings.ToLower(nome)
	slug = acentosReplacer.Replace(slug)
	slug = caracteresInvalidos.ReplaceAllString(slug, "-")
	slug = strings.Trim(slug, "-")
	return slug
}
