export type CheckoutMessages = {
  loading: string;
  frameTitle: string;
  notConfigured: string;
};

const en: CheckoutMessages = {
  loading: 'Loading checkout…',
  frameTitle: 'Checkout',
  notConfigured: 'The Shopware storefront URL is not configured, so the checkout cannot be embedded.',
};

const de: CheckoutMessages = {
  loading: 'Checkout wird geladen…',
  frameTitle: 'Checkout',
  notConfigured: 'Die URL des Shopware-Storefronts ist nicht konfiguriert, daher kann der Checkout nicht eingebettet werden.',
};

const byLanguage: Record<string, CheckoutMessages> = { de, en };

/** Built-in checkout texts for a BCP 47 locale, matched on its language subtag; English otherwise. */
export const checkoutMessages = (locale: string): CheckoutMessages => {
  const language = locale.toLowerCase().split('-')[0] ?? '';
  return byLanguage[language] ?? en;
};
