<script setup lang="ts">
</script>

<template>
  <div class="app">
    <router-view />
  </div>
</template>

<style>
:root {
  --primary-color: #51bf6f;
  --primary-dark: #3da358;
  --primary-light: #d1fae5;
  --border-color: #e5e7eb;
  --card-bg: #ffffff;
  --bg-color: #f9fafb;
  --text-secondary: #6b7280;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --radius-md: 8px;
  --radius-lg: 16px;
  --radius-sm: 4px;
  --spacing-md: 16px;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: #374151;
  background-color: #f9fafb;
}

#app {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.app {
  width: 100%;
  height: 100%;
}
</style>
