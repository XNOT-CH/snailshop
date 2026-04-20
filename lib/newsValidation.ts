export const NEWS_TITLE_MAX_LENGTH = 180;
export const NEWS_DESCRIPTION_MAX_LENGTH = 1200;
export const NEWS_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const NEWS_MAX_IMAGE_ASPECT_RATIO = 4;

const ABSOLUTE_HTTP_URL_PATTERN = /^https?:\/\/.+/i;

export function normalizeNewsTextInput(value: string): string {
  return value.trim().replaceAll(/\s+/g, " ");
}

export function normalizeNewsUrlInput(value: string): string {
  return value.trim();
}

export function isValidNewsUrl(value: string): boolean {
  return (
    !value ||
    value.startsWith("/") ||
    ABSOLUTE_HTTP_URL_PATTERN.test(value)
  );
}

export function validateNewsUrlInput(value: string): string | null {
  const normalized = normalizeNewsUrlInput(value);

  if (!normalized) {
    return null;
  }

  if (!isValidNewsUrl(normalized)) {
    return "URL ไม่ถูกต้อง (ต้องขึ้นต้นด้วย / หรือ http:// หรือ https://)";
  }

  return null;
}

export function validateNewsTextInput(
  value: string,
  options: {
    label: string;
    maxLength: number;
  },
): string | null {
  const normalized = normalizeNewsTextInput(value);

  if (!normalized) {
    return `กรุณากรอก${options.label}`;
  }

  if (normalized.length > options.maxLength) {
    return `${options.label}ต้องไม่เกิน ${options.maxLength} ตัวอักษร`;
  }

  return null;
}

export function validateNewsUploadFile(file: File): string | null {
  if (file.size > NEWS_MAX_UPLOAD_BYTES) {
    return "ไฟล์รูปต้องมีขนาดไม่เกิน 5MB";
  }

  if (!file.type.startsWith("image/")) {
    return "รองรับเฉพาะไฟล์รูปภาพ JPG, PNG, WebP และ GIF";
  }

  return null;
}

export function validateNewsImageDimensions(
  width: number,
  height: number,
): string | null {
  if (width <= 0 || height <= 0) {
    return "ไม่สามารถอ่านขนาดรูปภาพได้";
  }

  const aspectRatio = Math.max(width / height, height / width);
  if (aspectRatio > NEWS_MAX_IMAGE_ASPECT_RATIO) {
    return "สัดส่วนรูปภาพยาวเกินไป กรุณาใช้รูปที่สมดุลกว่านี้";
  }

  return null;
}
