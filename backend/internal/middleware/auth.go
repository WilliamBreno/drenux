package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// AuthRequired protege rotas exigindo um JWT válido no header
// Authorization: Bearer <token>. Se válido, injeta usuario_id e loja_id
// no contexto do Gin — qualquer handler depois desse middleware acessa
// com c.GetUint("loja_id"), por exemplo, sem precisar reler o token.
func AuthRequired(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"erro": "token não fornecido"})
			return
		}
		tokenString := strings.TrimPrefix(header, "Bearer ")

		token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
			return []byte(jwtSecret), nil
		})
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"erro": "token inválido ou expirado"})
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"erro": "token inválido"})
			return
		}

		// Números em claims JWT sempre decodificam como float64 — é assim
		// que o pacote encoding/json do Go trata número genérico em JSON.
		usuarioID, ok1 := claims["usuario_id"].(float64)
		lojaID, ok2 := claims["loja_id"].(float64)
		if !ok1 || !ok2 {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"erro": "token inválido"})
			return
		}

		c.Set("usuario_id", uint(usuarioID))
		c.Set("loja_id", uint(lojaID))
		c.Next()
	}
}