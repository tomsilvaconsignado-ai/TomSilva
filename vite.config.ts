import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  // Configuração inteligente da URL base para GitHub Pages e domínios personalizados
  let base = './';
  if (process.env.BASE_PATH) {
    base = process.env.BASE_PATH;
  } else if (process.env.CUSTOM_DOMAIN) {
    base = '/';
  } else if (process.env.GITHUB_ACTIONS === 'true' && process.env.GITHUB_REPOSITORY) {
    const repo = process.env.GITHUB_REPOSITORY.split('/')[1];
    if (repo && repo.toLowerCase().endsWith('.github.io')) {
      base = '/';
    } else if (repo) {
      base = `/${repo}/`;
    }
  }

  // Endereço público do portal (links de e-mail, login e compartilhamento).
  // Com domínio próprio, defina CUSTOM_DOMAIN no build (ex.: www.folhadaregiaonline.com.br).
  if (!process.env.VITE_SITE_URL) {
    if (process.env.CUSTOM_DOMAIN) {
      process.env.VITE_SITE_URL = `https://${process.env.CUSTOM_DOMAIN.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`;
    } else if (process.env.GITHUB_REPOSITORY) {
      const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
      process.env.VITE_SITE_URL = repo.toLowerCase().endsWith('.github.io') ? `https://${repo}` : `https://${owner}.github.io/${repo}`;
    } else {
      process.env.VITE_SITE_URL = 'https://tomsilvaconsignado-ai.github.io/TomSilva';
    }
  }

  return {
    base,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
