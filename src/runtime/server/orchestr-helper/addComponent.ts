import { z } from 'zod';
import { EntityComponentDefinition } from '@laioutr-core/canonical-types/orchestr';

/**
 * Typesafe helper for creating a single-property object with the name of the given component as key.
 *
 * @example
 * addComponent(ProductBase, () => { ... })
 * => { base: () => { ... } }
 *
 * // Can be used to spread in resolver
 * {
 *   ...addComponent(ProductBase, () => { ... })
 * }
 */
export const addComponent = <const T extends EntityComponentDefinition>(
  component: T,
  cb: () => z.infer<T['schema']>
): {
  [key in T['componentName']]: () => z.infer<T['schema']>;
} => ({ [component.componentName]: cb }) as any;
