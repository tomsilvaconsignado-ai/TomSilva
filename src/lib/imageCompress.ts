// Reduz e comprime fotos no navegador antes do envio.
// Fotos de celular costumam ter 3-8 MB; acima de ~600 KB o WhatsApp deixa de mostrar a imagem
// na prévia do link, e o site carrega mais devagar.

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    img.src = src;
  });

const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    reader.readAsDataURL(file);
  });

// Tamanho aproximado em bytes de um data URL base64
const dataUrlBytes = (dataUrl: string): number => Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);

/**
 * Devolve a foto como data URL JPEG com no máximo maxDimension px no maior lado e,
 * sempre que possível, abaixo de targetBytes. GIFs são mantidos como estão (animação).
 */
export const compressImageFile = async (
  file: File,
  { maxDimension = 1600, targetBytes = 400 * 1024 }: { maxDimension?: number; targetBytes?: number } = {}
): Promise<string> => {
  const original = await readAsDataUrl(file);
  if (file.type === 'image/gif') return original;

  let img: HTMLImageElement;
  try {
    img = await loadImage(original);
  } catch {
    return original;
  }

  const scale = Math.min(1, maxDimension / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return original;
  // Fundo branco: PNG com transparência ficaria preto ao virar JPEG
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.85;
  let result = canvas.toDataURL('image/jpeg', quality);
  while (dataUrlBytes(result) > targetBytes && quality > 0.5) {
    quality -= 0.1;
    result = canvas.toDataURL('image/jpeg', quality);
  }

  // Se a versão comprimida não ficou menor (foto já otimizada), mantém a original
  return dataUrlBytes(result) < file.size ? result : original;
};
