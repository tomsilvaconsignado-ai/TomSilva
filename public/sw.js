// Service worker do aplicativo Folha da Região.
// Existe para o portal poder ser instalado (Chrome, Edge, Android). De propósito NÃO guarda
// páginas nem arquivos do site em cache: tudo vem sempre da internet, então o leitor nunca
// fica preso numa versão antiga depois de uma atualização. Sem conexão, mostra um aviso.

const OFFLINE_HTML = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sem conexão - Folha da Região</title></head>
<body style="margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#f8fafc;color:#334155;text-align:center;padding:24px">
<p style="font-size:16px;font-weight:700;margin:0">Você está sem conexão com a internet.</p>
<p style="font-size:13px;margin:0">Conecte-se e toque em tentar novamente para ler as notícias da Folha da Região.</p>
<button onclick="location.reload()" style="margin-top:8px;padding:10px 20px;border:0;border-radius:10px;background:#0056a4;color:#fff;font-weight:700">Tentar novamente</button>
</body></html>`;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  // Remove caches de versões anteriores, se existirem
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request).catch(() =>
      new Response(OFFLINE_HTML, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
    )
  );
});
