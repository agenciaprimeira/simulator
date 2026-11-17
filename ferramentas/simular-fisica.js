// Integra numericamente as equacoes de voo do update() do index.html, no plano vertical
// (asas niveladas), para calibrar constantes sem precisar voar no navegador.
//
// As CONSTANTES sao lidas direto do objeto CFG do index.html (sempre em sincronia).
// As EQUACOES sao uma copia do update(): se mudar a fisica no jogo, atualize aqui tambem.
//
// Uso:   node ferramentas/simular-fisica.js

var fs = require('fs');
var path = require('path');

var html = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
var bloco = /var CFG = (\{[\s\S]*?\n  \});/.exec(html);
if (!bloco) { console.error('Nao achei "var CFG = {...};" no index.html'); process.exit(1); }
var C = eval('(' + bloco[1] + ')');

// derivados - mesmas formulas do index.html
var vPlaneio = 1.3 * C.stallSpeed;
C.dragK = C.gravity / C.glideRatio / (vPlaneio * vPlaneio);
C.propSpeed = C.maxSpeed / (1 - C.dragK * C.maxSpeed * C.maxSpeed / C.thrust);

var DT = 1 / 60;
function damp(c, t, l, dt) { return c + (t - c) * (1 - Math.exp(-l * dt)); }
function kmh(v) { return Math.round(v * 3.6) + ' km/h'; }

function novoEstado(o) {
  var s = { v: 0, y: 0, x: 0, pitch: 0, engine: 0, throttle: 0, sink: 0,
            flap: 0, gearPos: 1, onGround: false, freio: false };
  for (var k in o) s[k] = o[k];
  return s;
}

// um passo do update(); mouseY no padrao do jogo (-1 topo da tela, +1 base)
function passo(s, mouseY) {
  s.engine = damp(s.engine, s.throttle, C.engineSpool, DT);
  var vEstol = C.stallSpeed * (1 - C.flapStallGain * s.flap / 30);
  var vDecol = C.takeoffSpeed * vEstol / C.stallSpeed;
  var tPitch = -mouseY * C.maxPitch;

  if (s.onGround) {
    s.pitch = damp(s.pitch, 0, 4, DT);
    if (s.v >= vDecol && tPitch > 0.08) { s.onGround = false; s.pitch = 0.06; s.y += 0.05; s.decolou = true; }
  } else {
    var auth = Math.min(1, Math.max(0.25, s.v / vDecol));
    var queda = Math.max(0, 1 - s.v / vEstol);
    s.pitch = damp(s.pitch, tPitch * auth - queda * 0.8, 2.6, DT);
  }

  var empuxo = s.engine * C.thrust * Math.max(0, 1 - s.v / C.propSpeed);
  var k = C.dragK * (1 - C.gearDrag * (1 - s.gearPos)) * (1 + C.flapDrag * s.flap / 30);
  var acc = empuxo - k * s.v * s.v;
  if (!s.onGround) {
    var gamma = Math.atan2(s.v * Math.sin(s.pitch) - s.sink, Math.max(1, s.v * Math.cos(s.pitch)));
    acc -= C.gravity * Math.sin(gamma);
  } else {
    acc -= C.rollRunway + (s.freio ? C.brakeForce : 0);
  }
  s.v = Math.max(0, s.v + acc * DT);

  var y0 = s.y;
  var p = s.onGround ? 0 : s.pitch;
  s.x += s.v * Math.cos(p) * DT;
  s.y += s.v * Math.sin(p) * DT;
  var sust = s.v / vEstol;
  s.sink = damp(s.sink, (!s.onGround && sust < 1) ? (1 - sust * sust) * 40 : 0, 1.3, DT);
  if (!s.onGround) s.y -= s.sink * DT;
  s.vs = (s.y - y0) / DT;
  s.aviso = s.onGround ? '' : (sust < 1 ? 'ESTOL' : (sust < 1.18 ? 'VEL. BAIXA' : ''));
}

console.log('Constantes lidas do index.html: dragK=' + C.dragK.toFixed(6) +
            '  propSpeed=' + C.propSpeed.toFixed(0) + ' u/s\n');

// 1) decolagem com manche puxado, potencia maxima
console.log('== Decolagem (100%, manche puxado) ==');
[0, 10, 20].forEach(function (flap) {
  var s = novoEstado({ onGround: true, throttle: 1, flap: flap });
  var t = 0;
  while (!s.decolou && t < 30) { passo(s, -0.5); t += DT; }
  console.log('  flaps ' + (flap + '°').padEnd(4) + ' decola a ' + kmh(s.v) +
              ', ' + Math.round(s.x) + ' m de pista, ' + t.toFixed(1) + ' s');
});

// 2) corte de potencia em voo nivelado
console.log('\n== Motor a 0% em voo nivelado, manche neutro, a partir da vel. maxima ==');
(function () {
  var s = novoEstado({ v: C.maxSpeed, y: 300, engine: 1, throttle: 0 });
  var t = 0, primeiro = {};
  while (t < 60) { passo(s, 0); t += DT; if (s.aviso && !primeiro[s.aviso]) primeiro[s.aviso] = t.toFixed(1) + ' s'; }
  console.log('  primeiro aviso: ' + JSON.stringify(primeiro));
})();

// 3) mesmo voo lento com e sem flap
console.log('\n== Voo a 137 km/h, potencia 35%, manche neutro, 3 s ==');
[0, 20, 30].forEach(function (flap) {
  var s = novoEstado({ v: 38, y: 300, engine: 0.35, throttle: 0.35, flap: flap });
  for (var t = 0; t < 3; t += DT) passo(s, 0);
  console.log('  flaps ' + (flap + '°').padEnd(4) + ' perdeu ' + (300 - s.y).toFixed(1) +
              ' m, termina a ' + kmh(s.v) + ' ' + (s.aviso || ''));
});

// 4) estol e recuperacao em marcha lenta
console.log('\n== Estol em marcha lenta: 3 s sem corrigir, 4 s nariz baixo, depois planeio ==');
(function () {
  var s = novoEstado({ v: 43, y: 300 });
  for (var i = 0, t = 0; t <= 14; i++, t = i * DT) {
    var mouseY = t < 3 ? 0 : (t < 7 ? 0.32 : 0.14);
    passo(s, mouseY);
    if (i % 120 === 0) console.log('  t=' + t.toFixed(0).padStart(2) + 's  ' + kmh(s.v).padStart(9) +
      '  alt ' + s.y.toFixed(0).padStart(3) + ' m  V/S ' + s.vs.toFixed(1).padStart(5) + '  ' + s.aviso);
  }
})();
