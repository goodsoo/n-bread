import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 커스텀 도메인 배포: https://nbread.goodsoob.com/ (public/CNAME)
export default defineConfig({
	base: '/',
	plugins: [react()],
	server: {
		port: 7040,
		strictPort: true,
	},
});
