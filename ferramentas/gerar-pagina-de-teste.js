// Gera _teste_temporario.html na raiz do projeto a partir de index.html.
//
// A copia e identica ao jogo, com duas diferencas:
//  1. o loop roda por setTimeout em vez de requestAnimationFrame, entao continua
//     rodando mesmo com o painel de navegador oculto (rAF pausa nesse caso);
//  2. o estado interno fica exposto em window.__S, __CFG, __RW, __mouse e __velEstol,
//     para posicionar o aviao e medir direto.
//
// Uso:   node ferramentas/gerar-pagina-de-teste.js
// Depois de testar, APAGUE _teste_temporario.html.

var fs = require('fs');
var path = require('path');

var raiz = path.resolve(__dirname, '..');
var origem = path.join(raiz, 'index.html');
var destino = path.join(raiz, '_teste_temporario.html');

var s = fs.readFileSync(origem, 'utf8');

var ganchoLoop = 'requestAnimationFrame(animate);';
var ganchoEstado = 'var clock = new THREE.Clock();';
if (s.indexOf(ganchoLoop) < 0 || s.indexOf(ganchoEstado) < 0) {
  console.error('Nao achei os ganchos no index.html (o codigo mudou?). Procure por:');
  console.error('  ' + ganchoLoop);
  console.error('  ' + ganchoEstado);
  process.exit(1);
}

s = s.replace(ganchoLoop, 'setTimeout(animate, 16);');
s = s.replace(ganchoEstado, ganchoEstado +
  ' window.__S = S; window.__CFG = CFG; window.__RW = [RW_A, RW_B];' +
  ' window.__mouse = mouse; window.__velEstol = velEstol;');

fs.writeFileSync(destino, s);
console.log('Gerado: ' + destino);
console.log('Abra pelo painel de navegador (file:///...) e apague o arquivo ao terminar.');
