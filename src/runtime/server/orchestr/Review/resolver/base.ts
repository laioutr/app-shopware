import { defineComponentResolver } from '#imports';
import { ReviewBase } from '@laioutr-core/canonical-types/orchestr/review';

export default defineComponentResolver({
  label: 'Shopware Review Connector',
  entityType: 'Review',
  provides: [ReviewBase],
  resolve: async ({ entityIds }) => ({
    componentData: {
      1: {
        base: {
          title: 'Title 1',
          content: 'Review 1',
        },
      },
      2: {
        base: {
          title: 'Title 2',
          content: 'Review 2',
        },
      },
      3: {
        base: {
          title: 'Title 3',
          content: 'Review 3',
        },
      },
      4: {
        base: {
          title: 'Title 4',
          content: 'Review 4',
        },
      },
      5: {
        base: {
          title: 'Title 5',
          content: 'Review 5',
        },
      },
      6: {
        base: {
          title: 'Title 6',
          content: 'Review 6',
        },
      },
      7: {
        base: {
          title: 'Title 7',
          content: 'Review 7',
        },
      },
      8: {
        base: {
          title: 'Title 8',
          content: 'Review 8',
        },
      },
      9: {
        base: {
          title: 'Title 9',
          content: 'Review 9',
        },
      },
      10: {
        base: {
          title: 'Title 10',
          content: 'Review 10',
        },
      },
      11: {
        base: {
          title: 'Title 11',
          content: 'Review 11',
        },
      },
    },
  }),
});
