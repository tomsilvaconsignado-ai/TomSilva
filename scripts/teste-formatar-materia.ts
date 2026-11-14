// Teste rápido do formatador do texto da matéria: npx tsx scripts/teste-formatar-materia.ts
import assert from 'node:assert/strict';
import { formatarMateria } from '../src/lib/assets';

// texto corrido: cada linha vira parágrafo
assert.equal(
  formatarMateria('Primeiro parágrafo.\n\nSegundo com <strong>negrito</strong>.\nTerceiro.'),
  '<p>Primeiro parágrafo.</p>\n<p>Segundo com <strong>negrito</strong>.</p>\n<p>Terceiro.</p>',
);
// intertítulo, lista e citação em várias linhas ficam inteiros
const blocos = formatarMateria('Intro.\n<h2>Intertítulo</h2>\n<ul>\n  <li>um</li>\n  <li>dois</li>\n</ul>\n<blockquote>Frase\nem duas linhas</blockquote>\nFim.');
assert.equal(blocos, '<p>Intro.</p>\n<h2>Intertítulo</h2>\n<ul>\n<li>um</li>\n<li>dois</li>\n</ul>\n<blockquote>Frase\nem duas linhas</blockquote>\n<p>Fim.</p>');
// conteúdo que já vem em HTML não muda
assert.equal(formatarMateria('<p>Já formatado</p><p>Outro</p>'), '<p>Já formatado</p><p>Outro</p>');
// continua neutralizando script
assert.ok(!formatarMateria('Oi\n<script>alert(1)</script>').includes('<script'));
assert.equal(formatarMateria(''), '');
console.log('formatarMateria: 5 casos ok');
