import { authService, classifiedsService, STORAGE_KEYS, setStored, getStored } from '../src/lib/supabase';
import { UserProfile } from '../src/types/database';

async function runTests() {
  console.log('====================================================');
  console.log('INICIANDO BATERIA DE TESTES DE ACESSO AOS CLASSIFICADOS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
      failed++;
    }
  }

  // 1. Teste: Visitante sem login (anônimo / null) tentando publicar
  console.log('--- TESTE 1: Visitante sem login ---');
  try {
    await classifiedsService.saveClassified(
      { title: 'Venda de Carro', phone: '(79) 99999-9999', city: 'Estância' },
      null as any
    );
    assert(false, 'Visitante sem login deveria ter sido bloqueado');
  } catch (err: any) {
    assert(
      err.message.includes('não autenticado') || err.message.includes('Faça login'),
      `Bloqueio correto para visitante sem login: "${err.message}"`
    );
  }

  // 2. Teste: Usuário com conta bloqueada ('blocked')
  console.log('\n--- TESTE 2: Usuário com conta bloqueada ---');
  const blockedUser: UserProfile = {
    id: 'usr-blocked-test',
    email: 'bloqueado@teste.com',
    fullName: 'Usuário Bloqueado',
    role: 'reader',
    status: 'blocked',
    createdAt: new Date().toISOString()
  };
  try {
    await classifiedsService.saveClassified(
      { title: 'Venda de Terreno', phone: '(79) 99999-9999', city: 'Estância' },
      blockedUser
    );
    assert(false, 'Conta bloqueada deveria ter sido impedida de publicar');
  } catch (err: any) {
    assert(
      err.message.includes('restrição') || err.message.includes('inativa'),
      `Bloqueio correto para conta bloqueada: "${err.message}"`
    );
  }

  // 3. Teste: Usuário com conta suspensa ('suspended')
  console.log('\n--- TESTE 3: Usuário com conta suspensa ---');
  const suspendedUser: UserProfile = {
    id: 'usr-suspended-test',
    email: 'suspenso@teste.com',
    fullName: 'Usuário Suspenso',
    role: 'reader',
    status: 'suspended',
    createdAt: new Date().toISOString()
  };
  try {
    await classifiedsService.saveClassified(
      { title: 'Venda de Moto', phone: '(79) 99999-9999', city: 'Estância' },
      suspendedUser
    );
    assert(false, 'Conta suspensa deveria ter sido impedida de publicar');
  } catch (err: any) {
    assert(
      err.message.includes('restrição') || err.message.includes('inativa'),
      `Bloqueio correto para conta suspensa: "${err.message}"`
    );
  }

  // 4. Teste: Usuário com conta inativa ('inactive')
  console.log('\n--- TESTE 4: Usuário com conta inativa ---');
  const inactiveUser: UserProfile = {
    id: 'usr-inactive-test',
    email: 'inativo@teste.com',
    fullName: 'Usuário Inativo',
    role: 'reader',
    status: 'inactive',
    createdAt: new Date().toISOString()
  };
  try {
    await classifiedsService.saveClassified(
      { title: 'Aluguel de Casa', phone: '(79) 99999-9999', city: 'Estância' },
      inactiveUser
    );
    assert(false, 'Conta inativa deveria ter sido impedida de publicar');
  } catch (err: any) {
    assert(
      err.message.includes('inativa') || err.message.includes('restrição'),
      `Bloqueio correto para conta inativa: "${err.message}"`
    );
  }

  // 5. Teste: Usuário recém-cadastrado, conta ATIVA, SEM confirmação de e-mail e SEM token
  console.log('\n--- TESTE 5: Usuário recém-cadastrado (ativo, sem confirmação de e-mail, sem token) ---');
  const activeUnconfirmedUser: UserProfile = {
    id: 'usr-active-new-user',
    email: 'novousuario@teste.com',
    fullName: 'Novo Cidadão Cadastrado',
    role: 'reader',
    status: 'active',
    emailConfirmed: false, // E-MAIL NÃO CONFIRMADO
    emailConfirmedAt: undefined,
    phone: '(79) 99988-7766',
    city: 'Estância',
    state: 'SE',
    createdAt: new Date().toISOString()
  };

  try {
    const publishedAd = await classifiedsService.saveClassified(
      {
        title: 'Vende-se Bicicleta Aro 29 em Ótimo Estado',
        description: 'Bicicleta mountain bike em perfeito estado de conservação.',
        phone: '(79) 99988-7766',
        city: 'Estância',
        state: 'SE',
        priceType: 'fixed',
        price: 850
      },
      activeUnconfirmedUser
    );
    assert(Boolean(publishedAd && publishedAd.id), `Anúncio publicado com sucesso sem confirmação de e-mail e sem token! ID: ${publishedAd.id}`);
    assert(publishedAd.status === 'published' || publishedAd.status === 'pending', `Status do anúncio gerado: ${publishedAd.status}`);
  } catch (err: any) {
    assert(false, `Falha inesperada ao publicar anúncio com conta ativa: ${err.message}`);
  }

  // 6. Teste: Login de usuário com e-mail não confirmado no Supabase Auth
  console.log('\n--- TESTE 6: Login com credencial válida cujo Supabase retornaria Email not confirmed ---');
  // Simula signIn com mock do Supabase que retorna "Email not confirmed"
  const testEmail = 'tomsilva26@gmail.com';
  // Adiciona usuário ao storage local para teste de resolução
  const users = getStored<any[]>(STORAGE_KEYS.USERS, []);
  if (!users.some(u => u.email === testEmail)) {
    users.push({
      id: 'usr-tom-26',
      email: testEmail,
      fullName: 'Tom Silva',
      role: 'reader',
      status: 'active',
      emailConfirmed: false,
      passwordHash: 'senha123'
    });
    setStored(STORAGE_KEYS.USERS, users);
  }

  const loginRes = await authService.signIn(testEmail, 'senha123');
  assert(Boolean(loginRes.user), `Login autorizado com sucesso para conta ativa: ${loginRes.user?.email}`);
  assert(loginRes.error === null, `Sem erro retornado no login: erro = ${loginRes.error}`);
  assert(loginRes.user?.status === 'active', `Status do usuário logado é active: ${loginRes.user?.status}`);

  // 7. Teste: Cadastro real no Supabase Auth + Login imediato com e-mail não confirmado + Publicação nos Classificados
  console.log('\n--- TESTE 7: Fluxo Real Completo (Cadastro -> Login sem e-mail confirmado -> Publicação imediata) ---');
  const liveEmail = `cidadao_${Date.now()}@testeportal.com`;
  const livePass = 'SenhaForte@2026';
  
  console.log('Passo A: Cadastrando usuário...');
  const signUpRes = await authService.signUp(
    liveEmail,
    livePass,
    'Cidadão Teste Real',
    'reader',
    {
      phone: '(79) 99888-7711',
      city: 'Estância',
      state: 'SE',
      cpf: '111.222.333-44',
      accountType: 'pf',
      termsAccepted: true
    }
  );
  assert(Boolean(signUpRes.user), `Usuário cadastrado com sucesso: ${signUpRes.user?.email}`);

  console.log('Passo B: Fazendo login...');
  const liveLoginRes = await authService.signIn(liveEmail, livePass);
  assert(Boolean(liveLoginRes.user), `Login concluído com sucesso mesmo com confirmação de e-mail pendente no Supabase Auth!`);
  assert(liveLoginRes.error === null, `Sem mensagem de erro impeditiva no login.`);
  assert(liveLoginRes.user?.status === 'active', `Conta está ativa para navegação.`);

  console.log('Passo C: Publicando anúncio nos Classificados com a nova conta...');
  const liveAd = await classifiedsService.saveClassified(
    {
      title: 'Apartamento para Locação no Centro de Estância',
      description: 'Ótimo apartamento com 2 quartos, sala, cozinha e vaga de garagem.',
      phone: '(79) 99888-7711',
      city: 'Estância',
      state: 'SE',
      priceType: 'fixed',
      price: 1200
    },
    liveLoginRes.user!
  );
  assert(Boolean(liveAd && liveAd.id), `Anúncio publicado com sucesso nos Classificados! ID: ${liveAd.id}`);

  console.log('\n====================================================');
  console.log(`RESUMO: ${passed} PASSARAM | ${failed} FALHARAM`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
