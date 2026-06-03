import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// gh-pages 배포 경로: https://goodsoo.github.io/n-bread/
export default defineConfig({
	base: '/n-bread/',
	plugins: [react()],
});
