import { defineLinkResolver } from '#imports';

export default defineLinkResolver({
  label: 'Shopware Product Reviews Connector',
  sourceEntityType: 'Product',
  targetEntityType: 'Review',
  linkName: 'reviews',
  defaultLimit: 3,
  resolve: async ({ entityIds, pagination }) => ({
    links: {
      [entityIds[0]]: {
        entityIds: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].slice(pagination.offset, pagination.offset + pagination.limit),
        entityTotal: 10,
      },
    },
  }),
});
