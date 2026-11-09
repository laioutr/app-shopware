import { swTranslatedRaw } from './swTranslated';

type ShopwareMethod = { id: string; name?: string; description?: string; translated?: { name?: string; description?: string } };

/** A shipping or payment method as `ShopwareContextGetAction` answers it, in the request's language. */
export const toContextMethod = (method: ShopwareMethod) => {
  const description: unknown = swTranslatedRaw(method, 'description');
  return {
    id: method.id,
    name: (swTranslatedRaw(method, 'name') as string | undefined) ?? '',
    ...(typeof description === 'string' && description !== '' ? { description } : {}),
  };
};
