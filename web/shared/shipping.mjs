// Current approved rate: 50 THB per order, not per bottle or pack.
export const SHIPPING_POLICY_VERSION = 'flat-50-20261018';
export const DEFAULT_SHIPPING_FEE_SATANG = 5000;
// Supersede unconfirmed legacy settings; subsequent admin edits remain supported.
export function shippingFeeSatang(settings) {
  return settings?.shippingPolicyVersion === SHIPPING_POLICY_VERSION &&
    Number.isSafeInteger(settings.shippingFeeSatang) && settings.shippingFeeSatang >= 0
    ? settings.shippingFeeSatang : DEFAULT_SHIPPING_FEE_SATANG;
}
