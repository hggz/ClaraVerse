import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs-extra';
import type { PluginOption } from 'vite';

// Function to copy the PDF.js worker to the public directory
function copyPdfWorker(): PluginOption {
  return {
    name: 'copy-pdf-worker',
    buildStart() {
      try {
        const workerSrc = path.resolve(
          __dirname,
          'node_modules/pdfjs-dist/build/pdf.worker.min.js'
        );
        const workerDest = path.resolve(
          __dirname,
          'public/pdf.worker.min.js'
        );
        
        // Skip if file already exists and source exists
        if (fs.existsSync(workerSrc)) {
          console.log('Copying PDF.js worker to public directory');
          fs.copySync(workerSrc, workerDest);
        } else {
          console.warn('PDF.js worker source file not found:', workerSrc);
        }
        return Promise.resolve();
      } catch (err) {
        console.error('Error copying PDF.js worker:', err);
        return Promise.resolve();
      }
    }
  };
}

// Function to serve workflow_sync directory files
function serveWorkflowSync(): PluginOption {
  return {
    name: 'serve-workflow-sync',
    configureServer(server) {
      server.middlewares.use('/workflow_sync', (req, res, next) => {
        const filePath = path.resolve(__dirname, 'workflow_sync', req.url?.slice(1) || '');
        console.log('Serving workflow_sync file:', filePath);
        
        if (fs.existsSync(filePath) && path.extname(filePath) === '.json') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          const content = fs.readFileSync(filePath, 'utf-8');
          res.end(content);
        } else {
          next();
        }
      });
    }
  };
}

// Plugin to add WebContainer headers for production
function webContainerHeaders(): PluginOption {
  return {
    name: 'webcontainer-headers',
    generateBundle() {
      // Create _headers file for Netlify
      const netlifyHeaders = `/*
  Cross-Origin-Embedder-Policy: credentialless
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: cross-origin`;
      
      // Create vercel.json for Vercel
      const vercelConfig = {
        headers: [
          {
            source: "/(.*)",
            headers: [
              {
                key: "Cross-Origin-Embedder-Policy",
                value: "credentialless"
              },
              {
                key: "Cross-Origin-Opener-Policy", 
                value: "same-origin"
              },
              {
                key: "Cross-Origin-Resource-Policy",
                value: "cross-origin"
              }
            ]
          }
        ]
      };

      this.emitFile({
        type: 'asset',
        fileName: '_headers',
        source: netlifyHeaders
      });

      this.emitFile({
        type: 'asset',
        fileName: 'vercel.json',
        source: JSON.stringify(vercelConfig, null, 2)
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), copyPdfWorker(), serveWorkflowSync(), webContainerHeaders()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  base: process.env.ELECTRON_START_URL ? '/' : './',
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          pdfjs: ['pdfjs-dist']
        },
      },
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    fs: {
      // Allow serving files from the workflow_sync directory
      allow: ['..', 'workflow_sync']
    }
  },
  publicDir: 'public'
});
