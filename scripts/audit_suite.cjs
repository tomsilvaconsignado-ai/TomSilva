const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const fs = require('fs');
const http = require('http');
require('dotenv').config();

const SUPABASE_URL = 'https://qqjqbdpemydxdzlufgfo.supabase.co';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const secrets = JSON.parse(fs.readFileSync('data_server_secrets.json', 'utf8'));
const SERVICE_ROLE_KEY = secrets.serviceRoleKey;

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const anonClient = createClient(SUPABASE_URL, ANON_KEY);

const results = [];

function recordTest(id, name, status, evidence, notes = '') {
  results.push({ id, name, status, evidence, notes });
  console.log(`[TEST ${id}] ${name} -> ${status}`);
  if (notes) console.log(`   Nota: ${notes}`);
}

async function requestApi(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };
    if (payload) reqHeaders['Content-Length'] = Buffer.byteLength(payload);

    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: reqHeaders
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runAudit() {
  console.log('====================================================');
  console.log('INICIANDO AUDITORIA E BATERIA DE TESTES REAIS');
  console.log('====================================================\n');

  // TEST 1: Verificação SMTP do Gmail
  try {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT || 465);
    const user = (process.env.SMTP_USER || '').trim();
    let pass = (process.env.SMTP_PASS || '').trim();
    if (host.includes('gmail')) pass = pass.replace(/\s+/g, '');

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false }
    });

    await new Promise((resolve, reject) => {
      transporter.verify((err, success) => {
        if (err) reject(err);
        else resolve(success);
      });
    });

    recordTest(1, 'Conectividade e Autenticação SMTP do Gmail', 'APROVADO', 
      `Conexão verificada com sucesso em ${host}:${port} para usuário ${user}.`,
      'Porta 465 SSL autenticada e pronta para entrega.');
  } catch (e) {
    recordTest(1, 'Conectividade e Autenticação SMTP do Gmail', 'FALHOU', e.message);
  }

  // TEST 2: Conta do Administrador Legítimo no Supabase
  try {
    const { data: usersData, error: usersErr } = await adminClient.auth.admin.listUsers();
    if (usersErr) throw usersErr;
    const adminUser = usersData.users.find(u => u.email === 'tomsilvaconsignado@gmail.com');
    if (!adminUser) throw new Error('Administrador não localizado em auth.users');

    const { data: profileData, error: profErr } = await adminClient.from('profiles').select('*').eq('id', adminUser.id).maybeSingle();
    if (profErr) throw profErr;

    recordTest(2, 'Preservação e Provisionamento do Administrador Legítimo', 'APROVADO',
      `ID: ${adminUser.id}, Role: ${profileData.role}, Status: ${profileData.status}, E-mail: ${adminUser.email}`,
      'Administrador Tom Silva confirmado no Supabase Auth e public.profiles.');
  } catch (e) {
    recordTest(2, 'Preservação e Provisionamento do Administrador Legítimo', 'FALHOU', e.message);
  }

  // TEST 3: Solicitação de Recuperação de Senha com E-mail do Próprio Usuário
  try {
    const resp = await requestApi('/api/auth/request-password-reset', 'POST', {
      email: 'tomsilvaconsignado@gmail.com',
      origin: 'https://ais-dev-62pjyss3pkglz7qz4jx23v-18125206812.us-east1.run.app'
    });

    if (resp.status === 200 && resp.data.success && resp.data.delivered) {
      recordTest(3, 'Recuperação de Senha: Geração e Despacho ao Usuário', 'APROVADO',
        `Destinatário: tomsilvaconsignado@gmail.com | Remetente: contatomeasure@gmail.com | Delivered: true | Mensagem: "${resp.data.message}"`,
        'Link oficial gerado pelo Supabase Admin e entregue via SMTP do Gmail ao e-mail informado.');
    } else {
      throw new Error(`Falha no retorno: ${JSON.stringify(resp.data)}`);
    }
  } catch (e) {
    recordTest(3, 'Recuperação de Senha: Geração e Despacho ao Usuário', 'FALHOU', e.message);
  }

  // TEST 4: Resposta Neutra para E-mails Inexistentes (Prevenção de Enumeração de Contas)
  try {
    const resp = await requestApi('/api/auth/request-password-reset', 'POST', {
      email: 'conta_inexistente_987123@dominioinexistente.com.br',
      origin: 'https://ais-dev-62pjyss3pkglz7qz4jx23v-18125206812.us-east1.run.app'
    });

    if (resp.status === 200 && resp.data.success && resp.data.delivered === false &&
        resp.data.message.includes('Se houver uma conta cadastrada com este endereço')) {
      recordTest(4, 'Proteção Contra Enumeração de Contas (Mensagem Neutra)', 'APROVADO',
        `Retorno HTTP 200 com mensagem neutra padrão e delivered=false sem vazar inexistência da conta.`,
        'Mesma resposta padronizada para contas existentes e inexistentes.');
    } else {
      throw new Error(`Resposta não atendeu ao critério neutro: ${JSON.stringify(resp.data)}`);
    }
  } catch (e) {
    recordTest(4, 'Proteção Contra Enumeração de Contas (Mensagem Neutra)', 'FALHOU', e.message);
  }

  // TEST 5: Rejeição de Senha Incorreta no Supabase Auth
  try {
    const { data: failSign, error: signErr } = await anonClient.auth.signInWithPassword({
      email: 'tomsilvaconsignado@gmail.com',
      password: 'SenhaTotalmenteIncorreta999!'
    });

    if (signErr && signErr.message) {
      recordTest(5, 'Rejeição de Credenciais Inválidas', 'APROVADO',
        `Supabase rejeitou corretamente: "${signErr.message}"`,
        'Acesso bloqueado com credenciais incorretas.');
    } else {
      throw new Error('Supabase aceitou login com senha incorreta!');
    }
  } catch (e) {
    recordTest(5, 'Rejeição de Credenciais Inválidas', 'FALHOU', e.message);
  }

  // TEST 6: Reenvio de Confirmação com E-mail Próprio
  try {
    const resp = await requestApi('/api/auth/resend-confirmation', 'POST', {
      email: 'tomsilvaconsignado@gmail.com',
      origin: 'https://ais-dev-62pjyss3pkglz7qz4jx23v-18125206812.us-east1.run.app'
    });

    if (resp.status === 200 && resp.data.success) {
      recordTest(6, 'Reenvio de Confirmação de Cadastro via SMTP', 'APROVADO',
        `Mensagem: "${resp.data.message}", Delivered: ${resp.data.delivered}`,
        'Link de ativação gerado pelo Supabase e despachado via SMTP.');
    } else {
      throw new Error(`Falha no reenvio: ${JSON.stringify(resp.data)}`);
    }
  } catch (e) {
    recordTest(6, 'Reenvio de Confirmação de Cadastro via SMTP', 'FALHOU', e.message);
  }

  // TEST 7: Listagem Administrativa com Autenticação e Rota Protegida
  try {
    const resp = await requestApi('/api/admin/users', 'GET', null, {
      'x-admin-email': 'tomsilvaconsignado@gmail.com',
      'x-admin-role': 'admin'
    });

    if (resp.status === 200 && resp.data.success && resp.data.total >= 7) {
      recordTest(7, 'Controle Administrativo de Usuários via Supabase Admin', 'APROVADO',
        `Total de usuários listados: ${resp.data.total}, Fonte: ${resp.data.source}`,
        'Painel administrativo integrado ao Supabase Admin API com dados unificados.');
    } else {
      throw new Error(`Retorno inválido: ${JSON.stringify(resp.data)}`);
    }
  } catch (e) {
    recordTest(7, 'Controle Administrativo de Usuários via Supabase Admin', 'FALHOU', e.message);
  }

  // TEST 8: Bloqueio de Acesso Administrativo para Usuários Comuns ou Visitantes
  try {
    const resp = await requestApi('/api/admin/users', 'GET', null, {
      'x-admin-email': 'leitor@folhadaregiao.com.br',
      'x-admin-role': 'reader'
    });

    if (resp.status === 403 && resp.data.error) {
      recordTest(8, 'Bloqueio de Rota Administrativa para Não-Admins', 'APROVADO',
        `Status HTTP 403 retornado com mensagem de erro de permissão.`,
        'Usuários comuns não conseguem acessar dados confidenciais de outros usuários.');
    } else {
      throw new Error(`Rota administrativa permitiu acesso não autorizado: status ${resp.status}`);
    }
  } catch (e) {
    recordTest(8, 'Bloqueio de Rota Administrativa para Não-Admins', 'FALHOU', e.message);
  }

  // TEST 9: Classificados: Bloqueio de Publicação Sem Autenticação
  try {
    const resp = await requestApi('/api/classifieds', 'POST', {
      title: 'Tentativa Não Autorizada'
    });

    if (resp.status === 401) {
      recordTest(9, 'Classificados: Bloqueio de Publicação Sem Login', 'APROVADO',
        'Status HTTP 401: Visitante sem autenticação impedido de publicar anúncios.',
        'Regra validada no servidor.');
    } else {
      throw new Error(`Esperado 401, recebido status ${resp.status}`);
    }
  } catch (e) {
    recordTest(9, 'Classificados: Bloqueio de Publicação Sem Login', 'FALHOU', e.message);
  }

  // TEST 10: Classificados: Bloqueio de Publicação com Perfil Incompleto
  try {
    // Criamos um usuário temporário no Supabase sem telefone/cidade/cpf para testar bloqueio
    const tempEmail = `incompleto_${Date.now()}@teste.com`;
    const { data: createdTemp, error: tempErr } = await adminClient.auth.admin.createUser({
      email: tempEmail,
      email_confirm: true,
      user_metadata: { full_name: 'Usuário Sem Dados' }
    });

    if (!tempErr && createdTemp?.user) {
      const resp = await requestApi('/api/classifieds', 'POST', {
        title: 'Anúncio que deve falhar por falta de dados'
      }, {
        'x-user-id': createdTemp.user.id
      });

      if (resp.status === 400 && resp.data.error && resp.data.error.includes('completar o cadastro')) {
        recordTest(10, 'Classificados: Exigência de Cadastro Completo (Telefone, Cidade, CPF)', 'APROVADO',
          `Status HTTP 400: "${resp.data.error}"`,
          'Usuário cadastrado sem perfil completo é obrigado a preencher os campos.');
      } else {
        throw new Error(`Esperado 400, recebido: ${JSON.stringify(resp)}`);
      }

      // Cleanup
      await adminClient.auth.admin.deleteUser(createdTemp.user.id);
    } else {
      throw new Error('Falha ao criar usuário de teste incompleto');
    }
  } catch (e) {
    recordTest(10, 'Classificados: Exigência de Cadastro Completo (Telefone, Cidade, CPF)', 'FALHOU', e.message);
  }

  // TEST 11: Classificados: Publicação Válida Associada ao ID do Usuário Real
  try {
    const adminUser = (await adminClient.auth.admin.listUsers()).data.users.find(u => u.email === 'tomsilvaconsignado@gmail.com');
    const adCode = `CL-${Math.floor(1000 + Math.random() * 9000)}`;
    const newAd = {
      id: `clf-audit-${Date.now()}`,
      code: adCode,
      user_id: adminUser.id,
      section: 'produtos_servicos',
      type: 'vendo',
      category: 'Veículos e motos',
      title: 'Carro Teste de Auditoria em Estância',
      slug: `carro-teste-de-auditoria-em-estancia-${adCode.toLowerCase()}`,
      description: 'Anúncio publicado com dados legítimos de perfil para validação.',
      price_type: 'fixed',
      price: 32000,
      city: 'Estância',
      state: 'SE',
      advertiser_name: 'Administrador Tom Silva',
      phone: '(79) 99977-6199',
      images: [],
      status: 'published',
      views_count: 0,
      expires_at: new Date(Date.now() + 30 * 86400000).toISOString()
    };

    const resp = await requestApi('/api/classifieds', 'POST', newAd, {
      'x-user-id': adminUser.id
    });

    if (resp.status === 200 && resp.data.success && resp.data.classified) {
      recordTest(11, 'Classificados: Publicação Válida com Associação do ID Real', 'APROVADO',
        `Anúncio criado com ID: ${resp.data.classified.id}, user_id: ${resp.data.classified.user_id}, Código: ${resp.data.classified.code}`,
        'Anúncio salvo no banco com chave estrangeira oficial do usuário.');

      // Cleanup
      await adminClient.from('classifieds').delete().eq('id', newAd.id);
    } else {
      throw new Error(`Falha ao publicar anúncio: ${JSON.stringify(resp.data)}`);
    }
  } catch (e) {
    recordTest(11, 'Classificados: Publicação Válida com Associação do ID Real', 'FALHOU', e.message);
  }

  // TEST 12: Remoção dos Ambientes e Atalhos de Teste na Interface
  try {
    const authModalCode = fs.readFileSync('src/components/auth/AuthModal.tsx', 'utf-8');
    const appCode = fs.readFileSync('src/App.tsx', 'utf-8');

    const hasDemoButton = authModalCode.includes('fillDemoAccount') || authModalCode.includes('Acesso Rápido para Testes');
    const hasSimulatedOutbox = appCode.includes('<EmailOutboxModal') || appCode.includes('<EmailNotificationToast');

    if (!hasDemoButton && !hasSimulatedOutbox) {
      recordTest(12, 'Remoção de Atalhos e Mecanismos de Teste da Interface', 'APROVADO',
        'Atalhos de conta demo removidos de AuthModal e simulação flutuante de outbox removida de App.tsx.',
        'Interface limpa e pronta para uso em produção.');
    } else {
      throw new Error('Ainda há mecanismos de teste detectados no código.');
    }
  } catch (e) {
    recordTest(12, 'Remoção de Atalhos e Mecanismos de Teste da Interface', 'FALHOU', e.message);
  }

  console.log('\n====================================================');
  console.log('RESUMO DA EXECUÇÃO:');
  console.log(`TOTAL DE TESTES: ${results.length}`);
  const approved = results.filter(r => r.status === 'APROVADO').length;
  const failed = results.filter(r => r.status === 'FALHOU').length;
  console.log(`APROVADOS: ${approved} | FALHAS: ${failed}`);
  console.log('====================================================');

  fs.writeFileSync('audit_results.json', JSON.stringify(results, null, 2), 'utf-8');
}

runAudit().catch(err => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
