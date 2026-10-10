# Folha da Região - Portal de Notícias & Classificados

Portal completo de notícias regionais e classificados com integração Supabase, sistema de autenticação, painel administrativo e design responsivo.

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
