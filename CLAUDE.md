# Simulador de Voo — guia para o Claude Code

Simulador de voo 3D simples, em português, que roda no navegador. **Um único arquivo:
`index.html`** (HTML + CSS + JS, ~1070 linhas). Sem build, sem npm, sem servidor.
A única dependência é o **three.js r128**, carregado do CDN:
`https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js`
(build UMD, expõe o global `THREE`; a API usada inclui `PlaneBufferGeometry`,
`BoxBufferGeometry` etc., que mudaram de nome em versões novas — **não atualize o three.js
sem revisar isso**). Se o CDN falhar, a página mostra uma mensagem de erro no lugar do jogo.

O dono do projeto fala português; responda em português. Comentários do código são em
português sem acento (de propósito, para evitar problemas de encoding).

Os caminhos neste documento são relativos a esta pasta. A pasta veio de um HD externo, então
a letra do drive pode mudar de um computador para outro (era `D:\Simulador de voo`).

## Como rodar

- Pessoa: duplo clique em `index.html` ou em `Abrir simulador.bat`. Precisa de internet no
  primeiro carregamento (CDN do three.js).
- Claude (painel de navegador do app desktop): abra **esta pasta como pasta do projeto** e use
  `preview_start` / `navigate` com a URL `file:///<caminho>/index.html` (espaços viram `%20`).
  Arquivos **fora** da pasta do projeto abrem como "snapshot estático" e as ferramentas de
  página (javascript_tool, clique etc.) se recusam a agir neles.

## O que o jogo faz

Avião em terceira pessoa que segue o cursor do mouse com suavização (o mouse é o manche
absoluto: a posição na tela é a atitude alvo). Duas pistas: **01 (decolagem)** onde o jogador
nasce e **02 (pouso)** a ~7,1 km. Missão: decolar, voar até a 02, pousar e parar → "Missão
cumprida". A cada missão cumprida o destino (`S.dest`) troca para a outra pista: a seta e a
distância passam a apontar para ela e dá para decolar de novo e fazer a volta (pedido do dono).
**R** sempre volta ao início (pista 01, destino 02).

### Comandos (teclado e botões na tela fazem o mesmo)

| Tecla | Ação |
|---|---|
| Mouse | manche (cabrar/picar e rolar; a rolagem gera a curva) |
| **W / S** | acelera / desacelera (cada toque = degrau de 20%; segurar continua mudando) |
| **↓ / ↑** | baixa / recolhe flap uma posição (0°, 10°, 20°, 30°) |
| **G** | recolhe / baixa o trem de pouso (não recolhe no chão) |
| **B** | freio (só no chão) |
| **R** | reiniciar |
| **C** | alterna câmera afastada / próxima |

Os botões ficam no canto inferior direito (`#ctrls`) e existem porque **em alguns ambientes o
teclado não chega na página** (veja "Armadilhas").

## Mapa do `index.html`

Tudo dentro de uma IIFE no segundo `<script>`. Seções marcadas com banners `//  Nome  //`:

| Seção | O que tem |
|---|---|
| Configuracao | objeto `CFG` (todos os números ajustáveis), `CFG.dragK` e `CFG.propSpeed` derivados, `RW_A`, `RW_B`, `WORLD` |
| Renderer / cena | renderer, neblina, câmera, luzes (o sol segue o avião para a sombra) |
| Terreno | textura de grama gerada em canvas; chão 16000×16000 centrado em `WORLD` |
| Pistas | `buildRunway` (asfalto, faixas, números, placas, luzes, **áreas de giro** circulares nas duas cabeceiras), `onRunway` / `runwayAt` (inclui as áreas de giro) |
| Cenario | 1500 árvores com **InstancedMesh** (4 draw calls), morros dos lados do corredor, nuvens |
| Aviao | `buildPlane` (fuselagem, asas, **flaps** articulados, hélice, **trem** com pivôs), `aplicarFlaps`, `velEstol`, `aplicarTrem` |
| HUD | referências aos elementos, `setMsg` |
| Estado de voo | objeto `S`, `reset`, entrada (mouse com zona morta nos botões, `comando(e)`, teclado, `botao`, `moverFlap`, `alternarTrem`) |
| Utilidades | `forwardVector`, `damp` |
| Fisica | `crash`, **`update(dt)`** — o coração do jogo |
| Camera em terceira pessoa | `updateCamera` |
| Instrumentos | `updateHUD` (atualiza a cada 3 quadros) |
| Loop principal | `animate` com `requestAnimationFrame`, `dt` limitado a 0,05 s |

Unidades: 1 unidade ≈ 1 metro; velocidades em u/s (o HUD mostra km/h = u/s × 3,6).
Orientação: Euler `'YXZ'`; `yaw = 0` aponta para **−Z**; pitch positivo = nariz para cima;
roll negativo = asa direita para baixo; curva à direita = yaw diminuindo.

## Modelo de física (decisões que o dono do projeto pediu — não reverter sem pedir)

A velocidade é **resultado de forças**, integrada a cada quadro em `update`:

```
aceleração = empuxo − arrasto − g·sen(γ) − atrito_no_chão
empuxo  = S.engine · thrust · (1 − v / propSpeed)      // hélice: forte parada, cai com v
arrasto = dragK · fatorTrem · fatorFlap · v²
γ       = atan2(v·sen(pitch) − S.sink, v·cos(pitch))   // trajetória REAL, inclui o afundamento
```

- **Inércia** foi pedida explicitamente. A primeira versão fazia `velocidade → potência ×
  vmax` e o avião estolava 2–3 s após reduzir a potência; o usuário reclamou. Hoje, com motor
  em 0% e manche neutro, leva ~28 s até "VELOCIDADE BAIXA" e ~37 s até o estol.
- `dragK` é calibrado pelo **planeio 8:1** (`glideRatio`) a 1,3× a velocidade de estol, e
  `propSpeed` é escolhido para que empuxo = arrasto exatamente em `maxSpeed`. Calibrar o
  arrasto só pela velocidade máxima deixava o planeio em ~4:1 e o avião ficava **preso no
  estol** mesmo picando — bug real já corrigido.
- A gravidade age sobre γ **incluindo `S.sink`**: um avião caindo ganha velocidade. Sem isso o
  estol era "grudento".
- `S.engine` segue `S.throttle` com atraso (`engineSpool`) — o motor tem tempo de resposta.
- Sustentação ∝ v²: abaixo do estol o avião afunda `(1 − (v/vEstol)²)·40` m/s, com inércia
  (`damp`), e o **nariz cai sozinho** (`queda`), o que ajuda a recuperar.
- **Flaps**: o atuador anda `flapRate` °/s; a velocidade de estol cai com o ângulo **real**
  (`velEstol()`: até −30% em 30°), a de decolagem cai junto (`vDecol`), e o arrasto sobe até
  +80%. Medido: estol 158/143/127/111 km/h em 0/10/20/30°; decolagem a 188/169/150 km/h
  usando 199/158/122 m de pista com 0/10/20°.
- **Trem**: leva `gearTime` s; recolhido tira 25% do arrasto; tocar o chão com
  `gearPos < 0.99` = acidente ("pouso de barriga"); aviso "TREM RECOLHIDO" abaixo de 60 m
  descendo.
- **Solo**: atrito de rolagem 0,2 (asfalto) / 1,2 (grama). Valores maiores fizeram o avião
  "não andar" em potência baixa — o usuário reclamou duas vezes de "apertei acelerar e não
  aconteceu nada". A bequilha tem raio mínimo de curva (`minTurnRadius`) em baixa velocidade e
  fica suave em alta; parado ela não gira.
- **Toque no solo**: válido se v < 100 u/s, V/S > −22, |roll| < 0,35, pitch > −0,22 e trem
  embaixo. Fora da pista com toque suave = aviso (não é acidente).

## Armadilhas encontradas (leia antes de testar)

1. **`e.code` vem vazio** no navegador embutido do app (e em teclados virtuais/IME). Por isso
   `comando(e)` aceita `e.code` **ou** `e.key`. Nunca dependa só de `e.code`.
2. **Painel de navegador oculto pausa o `requestAnimationFrame`** → o jogo congela enquanto
   seu script de teste continua correndo no relógio. Medições ficam erradas sem nenhum erro
   aparente. Confira `document.visibilityState` antes de medir.
3. **`navigate` para a mesma URL pode não recarregar a página.** Scripts injetados antes
   continuam rodando e dois jogos disputam o mesmo HUD/teclado. Para garantir página nova:
   `tabs_create` + `navigate` na aba nova + `tabs_close` na antiga.
4. Eventos sintéticos de mouse brigam com o ponteiro real se ele estiver sobre o painel.
   Despache o `mousemove` continuamente (setInterval de 40 ms) durante o teste.
5. Teste de toque rápido de tecla (`computer` → `key`) dura ~50 ms: suficiente para os
   degraus de potência, mas não para "segurar". Para segurar, use `KeyboardEvent` keydown,
   espere, depois keyup.

### Teste confiável: página de teste gerada

```
node ferramentas/gerar-pagina-de-teste.js
```

Gera `_teste_temporario.html` **na raiz do projeto** (precisa estar dentro da pasta do
projeto, ver "Como rodar"), idêntico ao jogo, mas com o loop por `setTimeout` (roda mesmo com
o painel oculto) e o estado exposto em `window.__S`, `window.__CFG`, `window.__RW`,
`window.__mouse`, `window.__velEstol`. Com isso dá para posicionar o avião direto
(`Object.assign(__S, {...})`) e medir. **Apague o arquivo ao terminar.**

`node ferramentas/simular-fisica.js` integra numericamente as mesmas equações do `update`
(decolagem, corte de potência, estol e recuperação, voo lento com flaps). É uma **cópia** das
equações: se mudar a física no `index.html`, atualize esse arquivo também. Útil para calibrar
constantes antes de mexer no jogo.

Verificação mínima depois de qualquer mudança: `node --check` no script extraído (ou abrir
a página e ler o console), e testar no navegador com teclas reais.

## Ideias que ficaram em aberto

- Velocidade máxima com flaps baixados (Vfe) com aviso, como em aviões reais (oferecido,
  não pedido ainda).
- Copiar `three.min.js` r128 para dentro da pasta (ex.: `lib/`) e carregar local com o CDN
  como reserva, para funcionar sem internet.
