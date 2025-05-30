import { ReviewBase } from '@laioutr-core/canonical-types/orchestr/review';
import { defineShopwareComponentResolver } from '../../../action/defineShopwareAction';

export default defineShopwareComponentResolver({
  label: 'Shopware Review Connector',
  entityType: 'Review',
  provides: [ReviewBase],
  resolve: async ({ entityIds, $entity }) => ({
    entities: [
      {
        id: '1',
        base: () => ({
          title: 'Title 1',
          shortContent: 'Review 1',
          createdAt: new Date(1500000000000),
        }),
      },
      {
        id: '2',
        base: () => ({
          title: 'Title 2',
          shortContent: 'Review 2',
          createdAt: new Date(1600000000000),
        }),
      },
      {
        id: '3',
        base: () => ({
          title: 'Title 3',
          shortContent: 'Review 3',
          createdAt: new Date(1700000000000),
        }),
      },
      {
        id: '4',
        base: () => ({
          title: 'Title 4',
          shortContent: 'Review 4',
          createdAt: new Date(1550000000000),
        }),
      },
      {
        id: '5',
        base: () => ({
          title: 'Title 5',
          shortContent: 'Review 5',
          createdAt: new Date(1650000000000),
        }),
      },
      {
        id: '6',
        base: () => ({
          title: 'Title 6',
          shortContent: 'Review 6',
          createdAt: new Date(1690000000000),
        }),
      },
      {
        id: '7',
        base: () => ({
          title: 'Title 7',
          shortContent: 'Review 7',
          createdAt: new Date(1699000000000),
        }),
      },
      {
        id: '8',
        base: () => ({
          title: 'Title 8',
          shortContent: 'Review 8',
          createdAt: new Date(1710000000000),
        }),
      },
      {
        id: '9',
        base: () => ({
          title: 'Title 9',
          shortContent: 'Review 9',
          createdAt: new Date(1720000000000),
        }),
      },
      {
        id: '10',
        base: () => ({
          title: 'Title 10',
          shortContent: 'Review 10',
          createdAt: new Date(1730000000000),
        }),
      },
      {
        id: '11',
        base: () => ({
          title: 'Title 11',
          shortContent: 'Review 11',
          createdAt: new Date(1740000000000),
        }),
      },
    ],
  }),
});
