export async function imagemPublicaParaBase64(caminho) {
  const resposta = await fetch(caminho);

  if (!resposta.ok) {
    throw new Error(`Não foi possível carregar a imagem: ${caminho}`);
  }

  const blob = await resposta.blob();

  return new Promise((resolve, reject) => {
    const leitor = new FileReader();

    leitor.onloadend = () => resolve(leitor.result);
    leitor.onerror = reject;

    leitor.readAsDataURL(blob);
  });
}