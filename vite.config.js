import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, mkdirSync, existsSync } from 'fs'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-static-html',
      closeBundle() {
        // Copy static HTML files to dist
        const htmlFiles = [
          'setup.html',
          'dashboard.html',
          'room.html',
          'app.html',
          'landing.html',
          'register.html'
        ]
        
        htmlFiles.forEach(file => {
          try {
            copyFileSync(
              resolve(__dirname, file),
              resolve(__dirname, 'dist', file)
            )
            console.log(`Copied ${file} to dist/`)
          } catch (err) {
            console.error(`Error copying ${file}:`, err.message)
          }
        })
      }
    }
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
