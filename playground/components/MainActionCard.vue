<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  title: string;
  description: string;
  icon: string;
  gradientFrom: string;
  gradientTo: string;
  textColor: string;
  action: 'navigate' | 'view';
  route?: string;
  viewName?: string;
}

const props = defineProps<Props>();

const handleClick = () => {
  if (props.action === 'navigate' && props.route) {
    navigateTo(props.route);
  } else if (props.action === 'view' && props.viewName) {
    // Emit event to parent to change view
    emit('changeView', props.viewName);
  }
};

const emit = defineEmits<{
  changeView: [viewName: string];
}>();

// Create computed classes for gradients using predefined Tailwind classes
const hoverGradientClass = computed(() => {
  const fromColor = props.gradientFrom.replace('-500', '-50');
  const toColor = props.gradientTo.replace('-600', '-50');

  // Map to predefined Tailwind classes
  const gradientMap: Record<string, string> = {
    'from-indigo-50 to-purple-50': 'bg-gradient-to-br from-indigo-50 to-purple-50',
    'from-emerald-50 to-teal-50': 'bg-gradient-to-br from-emerald-50 to-teal-50',
    'from-rose-50 to-pink-50': 'bg-gradient-to-br from-rose-50 to-pink-50',
  };

  const key = `from-${fromColor} to-${toColor}`;
  return gradientMap[key] || 'bg-gradient-to-br from-gray-50 to-gray-50';
});

const iconGradientClass = computed(() => {
  const fromColor = props.gradientFrom;
  const toColor = props.gradientTo;

  // Map to predefined Tailwind classes
  const gradientMap: Record<string, string> = {
    'from-indigo-500 to-purple-600': 'bg-gradient-to-br from-indigo-500 to-purple-600',
    'from-emerald-500 to-teal-600': 'bg-gradient-to-br from-emerald-500 to-teal-600',
    'from-rose-500 to-pink-600': 'bg-gradient-to-br from-rose-500 to-pink-600',
  };

  const key = `from-${fromColor} to-${toColor}`;
  return gradientMap[key] || 'bg-gradient-to-br from-gray-500 to-gray-600';
});
</script>

<template>
  <button
    class="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-8 text-left shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
    @click="handleClick"
  >
    <div class="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" :class="hoverGradientClass"></div>
    <div class="relative z-10">
      <div class="mb-6 flex h-16 w-16 items-center justify-center rounded-xl shadow-lg" :class="iconGradientClass">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <!-- Orchestr queries Icon -->
          <path
            v-if="icon === 'orchestr-queries'"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v5a2 2 0 100 4h5a2 2 0 100-4V9L6.5 12.5l4.5 4.5V19l-5-5h-4z"
          />
          <!-- OAuth Icon -->
          <path
            v-else-if="icon === 'orchestr-actions'"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 12a8 8 0 0114-5M20 12a8 8 0 01-14 5M12 8v8m-4-4h8"
          />
        </svg>
      </div>
      <h3 class="mb-3 text-xl font-semibold text-gray-900">{{ title }}</h3>
      <p class="mb-4 leading-relaxed text-gray-600">{{ description }}</p>
      <div class="flex items-center font-medium" :class="textColor">
        <span>Get Started</span>
        <svg class="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  </button>
</template>
