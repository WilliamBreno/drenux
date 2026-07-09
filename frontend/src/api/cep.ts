export interface CepResultado {
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

// ViaCEP é gratuito, não exige chave e tem CORS liberado — chamado direto
// do navegador, sem passar pelo nosso backend.
export async function buscarCep(cep: string): Promise<CepResultado> {
  const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
  if (!resposta.ok) throw new Error('Falha ao consultar CEP');
  return resposta.json();
}
