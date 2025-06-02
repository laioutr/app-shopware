<script setup lang="ts">
import { ProductsByCategoryIdQuery } from '@laioutr-core/canonical-types/ecommerce';
import type { QueryWireRequest } from '@laioutr-core/orchestr/types';

const defaultRequest = {
  queries: [
    {
      id: 'cp17r0j24ts002324tv1',
      queryName: ProductsByCategoryIdQuery,
      arguments: {
        categoryId: '01916af8b36d722693574e6f2043a719',
      },
      sort: 'popularity:desc',
      pagination: {
        offset: 0,
        limit: 36,
      },
      components: ['base'],
    },
  ],
  clientEnv: {
    locale: 'de-DE',
    currency: 'EUR',
    custom: {},
  },
} satisfies QueryWireRequest;
</script>

<template>
  <LfcOrchestrRequestEditor :default-request="defaultRequest" />
</template>
