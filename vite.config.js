import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: 'room.html', dest: '.' },
        { src: 'dashboard.html', dest: '.' },
        { src: 'app.html', dest: '.' },
        { src: 'landing.html', dest: '.' },
        { src: 'register.html', dest: '.' },
        { src: 'room.js', dest: '.' },
        { src: 'app.js', dest: '.' },
        { src: 'styles.css', dest: '.' },
        { src: 'config.json', dest: '.' },
        { src: 'api', dest: '.' },
        { src: 'assets', dest: '.' },
      ]
    })
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
