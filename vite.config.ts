import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/shared-amortization-calculator/',
  plugins: [react()],
  test: {
    include: ['src/**/*.test.ts'],
  },
});
