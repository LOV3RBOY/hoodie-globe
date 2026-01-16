import { defineConfig } from 'vite'

export default defineConfig({
    root: '.',
    publicDir: 'public',
    build: {
        outDir: 'dist',
    },
    server: {
        port: 3000,
        open: true,
    },
    json: {
        stringify: true, // Handles large JSON files by stringifying instead of transforming
    },
})
