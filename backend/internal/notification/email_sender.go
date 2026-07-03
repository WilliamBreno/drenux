package notification

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

// EmailSender envia emails transacionais via API do Resend (resend.com).
// Free tier: 3.000 emails/mês, 100/dia — mais do que suficiente pra
// reset de senha nessa fase do produto.
type EmailSender struct {
	apiKey    string
	remetente string // ex: "Drenux <naoresponda@drenux.com.br>"
}

func NewEmailSender(apiKey, remetente string) *EmailSender {
	return &EmailSender{apiKey: apiKey, remetente: remetente}
}

type resendPayload struct {
	From    string `json:"from"`
	To      []string `json:"to"`
	Subject string `json:"subject"`
	Html    string `json:"html"`
}

// EnviarResetSenha manda o email com o link de redefinição de senha.
// O link aponta pro frontend, que vai ler o token da query string.
func (e *EmailSender) EnviarResetSenha(destinatario, nomeUsuario, linkReset string) error {
	html := fmt.Sprintf(`
		<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
			<h2>Redefinir senha</h2>
			<p>Olá, %s.</p>
			<p>Recebemos uma solicitação para redefinir a senha da sua conta. Se foi você, clique no botão abaixo:</p>
			<p style="margin: 24px 0;">
				<a href="%s" style="background: #b45f4d; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
					Redefinir minha senha
				</a>
			</p>
			<p style="color: #888; font-size: 14px;">Esse link expira em 1 hora. Se você não pediu essa alteração, pode ignorar este email com segurança — sua senha continua a mesma.</p>
		</div>
	`, nomeUsuario, linkReset)

	payload := resendPayload{
		From:    e.remetente,
		To:      []string{destinatario},
		Subject: "Redefinir sua senha",
		Html:    html,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("montando payload do email: %w", err)
	}

	req, err := http.NewRequest("POST", "https://api.resend.com/emails", bytes.NewBuffer(body))
	if err != nil {
		return fmt.Errorf("criando requisição pro Resend: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+e.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("enviando email via Resend: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return fmt.Errorf("Resend retornou status %d ao enviar email", resp.StatusCode)
	}

	return nil
}