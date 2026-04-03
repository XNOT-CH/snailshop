export const CHAT_MAX_MESSAGE_LENGTH = 1000;
export const CHAT_MAX_IMAGE_SIZE = 3 * 1024 * 1024;
export const CHAT_ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export const CHAT_IMAGE_ACCEPT_ATTRIBUTE = CHAT_ALLOWED_IMAGE_TYPES.join(",");
