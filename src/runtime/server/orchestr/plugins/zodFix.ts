import { defineNitroPlugin } from '#imports';
import { applyZodFix } from '@laioutr-core/canonical-types';

export default defineNitroPlugin(() => {
  applyZodFix();
});
