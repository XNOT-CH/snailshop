/**
 * Most items one checkout may carry. The server enforces it; the cart's quantity
 * selector uses it as the ceiling when a product's stock count is unknown, so the
 * two sides cannot drift apart.
 */
export const MAX_CART_QUANTITY = 50;
