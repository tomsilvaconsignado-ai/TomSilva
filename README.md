# Folha da Região - Portal de Notícias & Classificados

Portal completo de notícias regionais e classificados com integração Supabase, sistema de autenticação, painel administrativo e design responsivo.

---

## ⚠️ Atualização: Supabase como fonte única dos dados

Até a versão anterior, notícias, banners, configurações, comentários e denúncias editados no painel ficavam **apenas no navegador de quem editou** e não apareciam para os leitores. Agora tudo é lido e gravado no Supabase. Para ativar:

1. **Aplique a migração** `supabase/migrations/20261024000000_supabase_source_of_truth.sql` no Supabase (SQL Editor → colar → Run). Ela cria as colunas que faltavam, a tabela `site_settings`, a auditoria, as funções administrativas, as notificações automáticas e o bucket de mídia `media`.
2. **Entre no painel como administrador no navegador onde você editava o portal** e clique em **Importar conteúdo** no aviso amarelo. As matérias e os banners iniciais, mais tudo o que foi editado nesse navegador, serão gravados no banco.
3. **Troque a senha do administrador** no Supabase (Authentication → Users). A senha antiga estava escrita no código público do repositório.
4. Em **Authentication → URL Configuration**, inclua o endereço do portal com curinga em *Redirect URLs* (ex.: `https://tomsilvaconsignado-ai.github.io/TomSilva/**`), para que os links de confirmação e de recuperação funcionem.
5. **Confirmação de e-mail:** com *Confirm email* ligado (Authentication → Providers → Email), o usuário só entra depois de clicar no link. Se preferir liberar o acesso imediato, desligue essa opção no Supabase.

O login usa somente o Supabase Auth: não existe mais conta local nem senha embutida no código. As imagens enviadas pelo painel e pelos classificados vão para o Supabase Storage em vez de ficarem embutidas no banco.

**Servidor de API (`server.ts`):** no GitHub Pages ele não roda. Moderação, papéis, confirmação manual de e-mail e listagem de usuários agora funcionam direto pelo Supabase. Só o envio de e-mails personalizados pelo painel e o teste SMTP continuam exigindo o servidor. Para usá-los, hospede o `server.ts` e defina `VITE_API_BASE_URL` no build (veja `.env.example`).

---

## 🚀 Como Publicar Este Site no GitHub

Você pode publicar este site de forma 100% gratuita usando o **GitHub** e o **GitHub Pages** (ou conectando o repositório à **Vercel** ou **Netlify**).

### Opção 1: Publicar diretamente no GitHub Pages (Já configurado!)

O projeto já inclui um workflow automatizado em `.github/workflows/deploy.yml`. Sempre que você enviar o código para o GitHub, ele compilará e colocará o site no ar automaticamente.

#### Passo a Passo:

1. **Crie um novo repositório no GitHub:**
   - Acesse [github.com/new](https://github.com/new)
   - Dê um nome ao repositório (exemplo: `folhadaregiao` ou `portal-noticias`).
   - Mantenha como **Public** (necessário para GitHub Pages gratuito).
   - Não marque a opção de adicionar README (o projeto já tem).
   - Clique em **Create repository**.

2. **Envie os arquivos para o repositório:**
   No seu terminal, dentro da pasta do projeto:
   ```bash
   git init
   git add .
   git commit -m "feat: Portal de notícias e classificados Folha da Região"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/NOME-DO-REPOSITORIO.git
   git push -u origin main
   ```

3. **Ative o GitHub Pages:**
   - No GitHub, acesse seu repositório e vá em **Settings** > **Pages** (no menu lateral esquerdo).
   - Em **Build and deployment** > **Source**, selecione: **GitHub Actions**.
   - Pronto! O workflow criado compilará o projeto e disponibilizará o link do seu site (geralmente `https://seu-usuario.github.io/nome-do-repositorio/`).

4. **(Opcional) Configurar Variáveis de Ambiente no GitHub:**
   - Se for usar o banco de dados Supabase em produção:
   - Vá em **Settings** > **Secrets and variables** > **Actions**.
   - Adicione os secrets:
     - `VITE_SUPABASE_URL`: sua URL do Supabase
     - `VITE_SUPABASE_ANON_KEY`: sua chave anônima do Supabase

---

### Opção 2: Publicar com 1 Clique na Vercel (Recomendado para SPAs com Rotas)

A **Vercel** se conecta diretamente com a sua conta do GitHub e atualiza o site a cada commit:

1. Acesse [vercel.com](https://vercel.com) e entre com sua conta do GitHub.
2. Clique em **Add New...** > **Project**.
3. Selecione o repositório que você criou no GitHub.
4. A Vercel detectará automaticamente que é um projeto **Vite**.
5. Em **Environment Variables**, adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` se aplicável.
6. Clique em **Deploy**. Seu site estará no ar em poucos segundos com HTTPS e domínio próprio gratuito!

---

### Opção 3: Usando GitHub Desktop (Sem linha de comando)

Se você preferir não usar o terminal:

1. Baixe e instale o [GitHub Desktop](https://desktop.github.com/).
2. Abra o GitHub Desktop e vá em **File** > **Add Local Repository...**.
3. Selecione a pasta deste projeto.
4. Clique em **Publish repository** para criar e enviar diretamente para a sua conta no GitHub.
5. Em seguida, siga o **Passo 3** da Opção 1 para ativar o GitHub Pages.

---

## 🛠️ Executando Localmente no seu Computador

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor de desenvolvimento
npm run dev

# 3. Compilar para produção
npm run build
```

---

## 📁 Estrutura do Projeto

- `src/components/layout/`: Cabeçalho, rodapé e navegação.
- `src/components/news/`: Listagem, destaques, categorias e detalhes de notícias.
- `src/components/classifieds/`: Módulo de Classificados (anúncios, formulário com até 3 fotos, filtros, WhatsApp).
- `src/components/admin/`: Painel administrativo completo para notícias e classificados.
- `src/lib/supabase.ts`: Camada de persistência Supabase com fallback local resiliente.
- `supabase/schema.sql`: Script SQL completo com tabelas, políticas RLS e triggers.
