<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
    <!-- Main Content -->
    <main class="px-4 py-4">
      <!-- Main Menu -->
      <div class="mb-16 text-center">
        <h1 class="mb-3 text-4xl font-bold text-gray-900">Orchestr Playground</h1>
        <p class="text-xl text-gray-600">Choose a tool to test</p>
      </div>

      <div class="mx-auto grid max-w-6xl gap-8 md:grid-cols-2">
        <!-- Orchestr Request Editor Option -->
        <MainActionCard
          title="Orchestr Request Editor (Queries)"
          description="Test and debug Orchestr queries with our powerful development tools"
          icon="orchestr-queries"
          gradient-from="indigo-500"
          gradient-to="purple-600"
          text-color="text-indigo-600"
          action="navigate"
          route="/orchestr-queries"
        />

        <MainActionCard
          title="Orchestr Request Editor (Actions)"
          description="Test and debug Orchestr actions with our powerful development tools"
          icon="orchestr-actions"
          gradient-from="rose-500"
          gradient-to="pink-600"
          text-color="text-indigo-600"
          action="navigate"
          route="/orchestr-actions"
        />
      </div>
    </main>
  </div>
</template>
