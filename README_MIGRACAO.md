# Folha da Região Online - Portal de Notícias

Portal de notícias completo reproduzido com fidelidade visual e funcional, incluindo autenticação de usuários, persistência de banco de dados, painel administrativo e integração com **Supabase** e **GitHub**.

---

## 🚀 Como Conectar com o seu Supabase

### 1. Criar o Banco e Tabelas no Supabase
1. Acesse [https://supabase.com](https://supabase.com) e crie um novo projeto.
2. No menu lateral do seu projeto, acesse **SQL Editor**.
3. Abra o arquivo `supabase/schema.sql` (ou copie o conteúdo direto da aba **Supabase & GitHub** no Painel Admin do portal).
4. Cole o script SQL no editor do Supabase e clique em **Run**. Todas as tabelas (`profiles`, `articles`, `categories`, `ads`, `comments`, `newsletter_subscribers`), RLS e triggers serão criados automaticamente.

### 2. Configurar as Chaves de Acesso
No arquivo `.env` (ou configurando na aba **Supabase & GitHub** do Painel Admin):
```env
VITE_SUPABASE_URL="https://seu-projeto.supabase.co"
VITE_SUPABASE_ANON_KEY="sua-chave-anon-publica-aqui"
```

---

## 🔐 Sistema de Autenticação

- **Cadastro de Usuários**: Leitores e jornalistas podem se cadastrar informando Nome, E-mail e Senha.
- **Login e Sessões**: Sessões mantidas via Supabase Auth com persistência.
- **Perfis de Usuário**:
  - `reader`: Pode ler, curtir notícias e comentar.
  - `editor` / `admin`: Acesso liberado à Área Administrativa para cadastrar notícias e gerenciar publicidades.
- **Contas de Teste Integradas** (1 clique no modal de login):
  - **Administrador**: `admin@folhadaregiao.com.br` | Senha: `admin123`
  - **Leitor**: `leitor@folhadaregiao.com.br` | Senha: `leitor123`

---

## 📦 Como Enviar para o GitHub

Execute os comandos no terminal do seu projeto:

```bash
# 1. Iniciar o repositório Git local
git init
git add .
git commit -m "feat: Portal de Notícias Folha da Região com Supabase e Auth"

# 2. Conectar ao seu repositório no GitHub
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/folha-da-regiao-online.git

# 3. Enviar os arquivos
git push -u origin main
```

---

## 📰 Estrutura do Portal

- **TopBar Marquee**: Cotações ao vivo de moedas (Dólar, Euro) e clima de Estância/SE.
- **Publicidades Dinâmicas**: Suporte a vídeos `.mp4` com autoplay, gifs animados e banners estáticos (comércios de Sergipe: PAF Sergipe, Vidraçaria Manancial, Viana, LS Suplementos, Contag, etc.).
- **Leitor de Notícia**: Página dedicada com contador de visualizações atômico, compartilhamento em redes sociais e sistema de comentários.
- **Painel Administrativo**: Visão geral de métricas, CRUD de notícias e anúncios.
