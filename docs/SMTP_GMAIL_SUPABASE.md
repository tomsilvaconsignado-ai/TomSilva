# E-mails de autenticação pelo Gmail (SMTP no Supabase)

Este guia faz o Supabase Auth enviar **confirmação de cadastro, redefinição de senha, link mágico, troca de e-mail e convite** pelo seu Gmail, usando uma **senha de app**, em vez do SMTP padrão do Supabase.

> Por que trocar: o SMTP embutido do Supabase só entrega para e-mails autorizados da equipe do projeto, tem limite de cerca de **2 e-mails por hora** e não tem garantia de entrega. Ele serve só para testes.

Projeto: `qqjqbdpemydxdzlufgfo`

---

## 1. Pré-requisitos no Gmail

1. A conta Google precisa ter **verificação em duas etapas** ativada. Sem ela, a opção de senha de app não aparece.
2. Gere a senha de app em <https://myaccount.google.com/apppasswords>. O Google mostra 16 letras, como `abcd efgh ijkl mnop`.
3. **Nunca** coloque essa senha no código, no `.env.example` ou em commits. Ela vai só no painel do Supabase e, se usar o servidor Node, no `.env` local, que é ignorado pelo git.

## 2. Configurar o SMTP no painel do Supabase

Abra: <https://supabase.com/dashboard/project/qqjqbdpemydxdzlufgfo/auth/smtp>
(menu **Authentication → Emails → SMTP Settings**) e ative **Enable custom SMTP**.

| Campo | Valor |
|---|---|
| Sender email | o seu Gmail (ex.: `seuemail@gmail.com`) |
| Sender name | `Folha da Região` |
| Host | `smtp.gmail.com` |
| Port | `587` (STARTTLS). Se der erro, use `465` (SSL). |
| Username | o seu Gmail completo |
| Password | a senha de app, **sem espaços** |
| Minimum interval between emails | deixe o padrão (60 s) |

Observações:

- O **Sender email** precisa ser o próprio Gmail ou um alias já cadastrado e verificado em Gmail → Configurações → Contas → **Enviar e-mail como**. Se não for, o Gmail troca o remetente pelo endereço da conta, ou o e-mail cai no spam.
- Um endereço `@folhadaregiaonline.com.br` como remetente só funciona se for alias verificado no Gmail. Mesmo assim, sem SPF/DKIM do domínio apontando para o Google, a entrega piora.

## 3. Ajustar o limite de envio do Auth

Ao ativar um SMTP próprio, o Supabase passa a limitar o envio a **30 e-mails por hora**.

Abra: <https://supabase.com/dashboard/project/qqjqbdpemydxdzlufgfo/auth/rate-limits>

- Em **Rate limit for sending emails**, use algo entre **60 e 100 por hora**. Não passe disso, porque o Gmail tem limite diário (veja a seção 7).

## 4. Site URL e Redirect URLs

Abra: <https://supabase.com/dashboard/project/qqjqbdpemydxdzlufgfo/auth/url-configuration>

⚠️ **ATENÇÃO CRÍTICA**: NÃO configure `https://folhadaregiaonline.com.br` no campo **Site URL** enquanto o seu domínio próprio não tiver DNS/apontamento configurado e funcionando! Usar esse domínio sem DNS faz com que qualquer link de confirmação do e-mail caia na tela de erro: `DNS_PROBE_FINISHED_NXDOMAIN`.

**Site URL Recomendada**:
```
https://tomsilvaconsignado-ai.github.io/TomSilva
```
*(ou a URL do seu ambiente de desenvolvimento/preview no Google Cloud Run se estiver testando por lá)*

**Redirect URLs**: adicione todas as linhas abaixo (uma por linha):

```
https://tomsilvaconsignado-ai.github.io/TomSilva/**
https://*.run.app/**
http://localhost:3000/**
https://folhadaregiaonline.com.br/**
https://www.folhadaregiaonline.com.br/**
```

Por que usar `/**`: o app monta o link de retorno a partir da página em que o usuário está (`getAuthRedirectUrl` em `src/lib/supabase.ts`). Pode ser a home ou a página de uma notícia, sempre com `?action=reset-password` ou `#confirm-email`. O `**` aceita qualquer caminho. Se o endereço de retorno não estiver nessa lista, o Supabase manda o usuário para a Site URL.

> **Importante**: O deploy público ativo do portal é feito pelo GitHub Pages (`https://tomsilvaconsignado-ai.github.io/TomSilva`). Só altere a Site URL para `https://folhadaregiaonline.com.br` quando você tiver contratado e configurado o DNS do domínio no Registro.br / Cloudflare.

## 5. Templates de e-mail em português

Abra: <https://supabase.com/dashboard/project/qqjqbdpemydxdzlufgfo/auth/templates>

Para cada aba, copie o **Subject** abaixo e cole no corpo o conteúdo inteiro do arquivo HTML correspondente, que está em `supabase/templates/`.

| Aba no painel | Subject (assunto) | Arquivo |
|---|---|---|
| Confirm sign up | `Confirme seu e-mail na Folha da Região` | `confirmation.html` |
| Reset password | `Redefinição de senha — Folha da Região` | `recovery.html` |
| Magic link | `Seu link de acesso à Folha da Região` | `magic_link.html` |
| Change email address | `Confirme a troca de e-mail — Folha da Região` | `email_change.html` |
| Invite user | `Você foi convidado para a Folha da Região` | `invite.html` |
| Password changed (notificação de segurança) | `Sua senha da Folha da Região foi alterada` | `password_changed_notification.html` |

- Os templates usam as variáveis oficiais do Supabase: `{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .NewEmail }}`, `{{ .Token }}` e `{{ .SiteURL }}`.
- A notificação **Password changed** só é enviada se as *security notifications* estiverem ativadas no projeto, na mesma tela de templates.
- O app já trata o link padrão `{{ .ConfirmationURL }}` (`src/App.tsx`, evento `PASSWORD_RECOVERY` e `#confirm-email`). Por isso **não troque** o link por um link próprio com `{{ .TokenHash }}` sem ajustar o código antes.

## 6. Testar

1. No portal, peça **Esqueci minha senha** com um e-mail que já tenha conta. Confira que chega **um único** e-mail, do seu Gmail, com o visual da Folha da Região, e que o link abre o modal de nova senha.
2. Crie uma conta nova e confirme pelo e-mail recebido.
3. Se o e-mail não chegar, veja os logs em <https://supabase.com/dashboard/project/qqjqbdpemydxdzlufgfo/logs/auth-logs>. O erro `535 Username and Password not accepted` significa senha de app errada ou com espaços.
4. Se o link der "Token has expired or is invalid" logo no primeiro clique, o antivírus ou o filtro do e-mail corporativo pode ter "aberto" o link antes do usuário. Peça um novo link.

## 7. Limites do Gmail e o próximo passo

- Uma conta Gmail comum aceita cerca de **500 destinatários por dia**. No Google Workspace, o limite é cerca de 2.000. Acima disso, o Google bloqueia o envio por até 24 horas.
- Para crescer (newsletter, muitos cadastros), migre para um serviço transacional, como **Resend**, **Brevo**, **Amazon SES** ou **Postmark**, com o domínio `folhadaregiaonline.com.br` autenticado (SPF, DKIM e DMARC). Basta trocar host, usuário e senha na mesma tela do passo 2. Os templates continuam valendo.

## 8. E o servidor Node (`server.ts`)?

- No GitHub Pages **não existe servidor**. Todos os e-mails de autenticação saem pelo Supabase Auth, configurado acima.
- Se você rodar o `server.ts` (`npm run dev`/`npm start`), ele tem um envio próprio por nodemailer para avisos do painel administrativo e moderação (`/api/send-email`) e para reserva de recuperação e confirmação. Para usar o mesmo Gmail, preencha no `.env` local:

  ```env
  SMTP_HOST="smtp.gmail.com"
  SMTP_PORT="587"
  SMTP_SECURE="false"
  SMTP_USER="seuemail@gmail.com"
  SMTP_PASS="senha-de-app-sem-espacos"
  SMTP_FROM_NAME="Folha da Região"
  SMTP_FROM_EMAIL="seuemail@gmail.com"
  ```

- O front só chama a recuperação do servidor (`/api/auth/request-password-reset`) **quando o Supabase não conseguiu enviar**. Assim o usuário não recebe dois e-mails, e o segundo link não invalida o primeiro.
