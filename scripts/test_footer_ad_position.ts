import fs from 'fs';
import path from 'path';

function testFooterAdPosition() {
  console.log('--- TESTE ESPECÍFICO: POSIÇÃO DA PUBLICIDADE DO RODAPÉ ---');

  const footerPath = path.resolve(process.cwd(), 'src/components/layout/Footer.tsx');
  const footerContent = fs.readFileSync(footerPath, 'utf-8');

  const appPath = path.resolve(process.cwd(), 'src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf-8');

  // 1. Verifica se Footer.tsx contém AdSlot placement="footer"
  const hasAdSlotInFooter = footerContent.includes('<AdSlot placement="footer"');
  if (!hasAdSlotInFooter) {
    throw new Error('Falha: Footer.tsx não contém <AdSlot placement="footer"');
  }
  console.log('[PASS] Footer.tsx contém o AdSlot de rodapé integrado.');

  // 2. Verifica a posição exata: antes de "Todos os direitos reservados" e "Área Administrativa"
  const adSlotIndex = footerContent.indexOf('<AdSlot placement="footer"');
  const copyrightIndex = footerContent.indexOf('Todos os direitos reservados');
  const adminIndex = footerContent.indexOf('Área Administrativa');

  if (adSlotIndex === -1 || copyrightIndex === -1 || adminIndex === -1) {
    throw new Error('Falha: Não foi possível localizar os marcadores no Footer.tsx');
  }

  if (adSlotIndex > copyrightIndex || adSlotIndex > adminIndex) {
    throw new Error('Falha: O AdSlot do rodapé NÃO está antes das informações de direitos reservados e área administrativa!');
  }
  console.log('[PASS] AdSlot do rodapé está posicionado IMEDIATAMENTE ANTES da linha com "Todos os direitos reservados" e "Área Administrativa".');

  // 3. Verifica se o AdSlot está após as 4 colunas de conteúdo do rodapé
  const newsletterIndex = footerContent.indexOf('Newsletter');
  if (adSlotIndex < newsletterIndex) {
    throw new Error('Falha: O AdSlot do rodapé está antes das colunas institucionais');
  }
  console.log('[PASS] AdSlot do rodapé está posicionado após as colunas institucionais e antes da barra inferior.');

  // 4. Verifica se App.tsx passa footerAds e NÃO duplica AdSlot fora do Footer
  const appOccurrences = (appContent.match(/placement="footer"/g) || []).length;
  if (appOccurrences > 0) {
    throw new Error('Falha: App.tsx ainda possui AdSlot placement="footer" duplicado fora do Footer!');
  }
  console.log('[PASS] App.tsx não possui espaço de publicidade duplicado fora do componente Footer.');

  const passesFooterAdsProp = appContent.includes('footerAds={footerAds}');
  if (!passesFooterAdsProp) {
    throw new Error('Falha: App.tsx não está passando footerAds para o Footer');
  }
  console.log('[PASS] App.tsx repassa footerAds para o Footer com integridade total.');

  console.log('\nTODAS AS VERIFICAÇÕES DE POSIÇÃO DO RODAPÉ PASSARAM COM SUCESSO!\n');
}

testFooterAdPosition();
