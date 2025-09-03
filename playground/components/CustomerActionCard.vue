<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  buttonText: string;
  buttonColor: string;
  route: string;
}

const props = defineProps<Props>();

const handleClick = () => {
  navigateTo(props.route);
};

// Computed button classes without disabled state
const buttonClasses = computed(
  () => `w-full rounded-md px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors ${props.buttonColor}`
);
</script>

<template>
  <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
    <!-- Logo/Icon Section -->
    <div class="mb-4 text-center">
      <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-lg" :class="iconColor">
        <svg
          class="h-6 w-6"
          :class="iconColor.replace('bg-', 'text-').replace('-100', '-600')"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            v-if="icon === 'view'"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 10h16M4 14h16M4 18h16"
          />
          <path
            v-else-if="icon === 'create'"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
          <path
            v-else-if="icon === 'update'"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
          <path
            v-else-if="icon === 'delete'"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
          <path
            v-else-if="icon === 'user'"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5.121 17.804A9 9 0 1112 21a9 9 0 01-6.879-3.196zM15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            v-else-if="icon === 'star'"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l2.036 6.29a1 1 0 00.95.69h6.6c.969 0 1.371 1.24.588 1.81l-5.347 3.89a1 1 0 00-.364 1.118l2.036 6.29c.3.921-.755 1.688-1.54 1.118l-5.347-3.89a1 1 0 00-1.176 0l-5.347 3.89c-.784.57-1.838-.197-1.54-1.118l2.036-6.29a1 1 0 00-.364-1.118l-5.347-3.89c-.783-.57-.38-1.81.588-1.81h6.6a1 1 0 00.95-.69l2.036-6.29z"
          />
        </svg>
      </div>
    </div>

    <!-- Content Section -->
    <div class="text-center">
      <h3 class="text-lg font-medium text-gray-900">{{ title }}</h3>
      <p class="mt-1 text-sm text-gray-500">{{ description }}</p>
    </div>

    <!-- Button Section -->
    <div class="mt-4">
      <button :class="buttonClasses" @click="handleClick">
        {{ buttonText }}
      </button>
    </div>
  </div>
</template>
