// Upload direto do navegador pro Cloudinary, usando um preset "unsigned"
// — não precisa de chave secreta no frontend, só do cloud name e do
// nome do preset (ambos seguros de expor publicamente, é assim que o
// Cloudinary foi desenhado pra funcionar nesse modo).
export async function enviarImagem(arquivo: File): Promise<string> {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary não configurado (faltam variáveis de ambiente).');
  }

  const formData = new FormData();
  formData.append('file', arquivo);
  formData.append('upload_preset', uploadPreset);

  const resposta = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!resposta.ok) {
    throw new Error('Falha no upload da imagem.');
  }

  const dados = await resposta.json();
  return dados.secure_url as string;
}

// Pede ao Cloudinary uma versão já redimensionada/cortada da imagem
// (200x200, foco automático), em vez de carregar o arquivo original
// inteiro só pra mostrar pequeno na tela.
export function logoMiniatura(url: string): string {
  if (!url.includes('/upload/')) return url;
  return url.replace('/upload/', '/upload/c_fill,w_200,h_200,g_auto/');
}