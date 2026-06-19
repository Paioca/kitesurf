// Reduz a imagem NO NAVEGADOR antes do upload. Corta bytes ~10-30x (upload
// rápido no 4G), evita o limite de ~4,5MB do serverless da Vercel, e descarta
// EXIF/GPS antes de sair do aparelho. createImageBitmap com imageOrientation
// 'from-image' já aplica a rotação EXIF na hora de desenhar. Em qualquer falha
// (navegador antigo etc.), devolve o arquivo original — o servidor ainda valida.
export async function downscaleImage(file: File, maxEdge = 1280, quality = 0.82): Promise<File> {
  if (typeof document === 'undefined' || !file.type.startsWith('image/')) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) return file;
    const name = file.name.replace(/\.\w+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
