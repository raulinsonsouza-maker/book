export const MAX_ENTITY_PHOTO_BYTES = 350_000;
export const MAX_SERVICE_PHOTO_BYTES = 2 * 1024 * 1024;

export function readEntityImageFile(
  file: File | null,
  onOk: (dataUrl: string) => void,
  onError: (msg: string) => void,
  maxBytes: number = MAX_ENTITY_PHOTO_BYTES,
) {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    onError("Envie uma imagem (PNG, JPG ou WebP)");
    return;
  }
  if (file.size > maxBytes) {
    onError("Imagem muito grande");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => onOk(String(reader.result || ""));
  reader.readAsDataURL(file);
}
