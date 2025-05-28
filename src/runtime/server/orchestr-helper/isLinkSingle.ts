import { LinkSingle } from '@laioutr-core/orchestr/types';

export const isLinkSingle = (link: unknown): link is LinkSingle =>
  typeof link === 'object' && link !== null && typeof (link as any).sourceId === 'string' && typeof (link as any).targetId === 'string';
