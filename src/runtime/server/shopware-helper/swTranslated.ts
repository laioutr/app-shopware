import { ShopwareProduct } from '../types/shopware';

export function swTranslated<TEntity extends ShopwareProduct, TKey extends keyof TEntity['translated']>(
  rawEntity: TEntity | undefined,
  key: TKey & keyof TEntity
): TEntity[TKey] {
  return (rawEntity?.translated as any)?.[key] ?? rawEntity?.[key];
}
