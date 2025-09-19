/** This is not absolutely correct, but it's a good enough approximation. */
export const isShopwareId = (id: string) => /^[0-9a-f]{32}$/i.test(id);

/** Extract the shopware id from a string. E.g. fallback slugs of format "slug-<shopware-id>" */
export const extractShopwareId = (str: string) => str.match(/([0-9a-f]{32})$/i)?.[1];
