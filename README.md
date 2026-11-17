# Simulador de Voo

Simulador de voo 3D no navegador: decole na pista 01, voe ~7 km e pouse na pista 02.

## Como abrir

Dê duplo clique em **`Abrir simulador.bat`** (ou direto em `index.html`).
Funciona em Chrome, Edge ou Firefox. Precisa de internet no primeiro carregamento, porque a
biblioteca 3D (three.js) vem da internet.

Clique uma vez dentro da página antes de usar o teclado.

## Comandos

| Tecla | Botão na tela | Ação |
|---|---|---|
| Mouse | — | controla o avião (o cursor é o manche) |
| **W** | W acelerar | aumenta a potência (cada toque +20%) |
| **S** | S desacelerar | reduz a potência |
| **↓** | ↓ baixa flap | baixa o flap uma posição (0°, 10°, 20°, 30°) |
| **↑** | ↑ recolhe flap | recolhe o flap uma posição |
| **G** | G trem | recolhe / baixa o trem de pouso |
| **B** | B freio | freia (só no chão) |
| **R** | R reiniciar | recomeça |
| **C** | — | troca a câmera |

## Voo completo

1. Baixe 10° de flap (↓) e acelere (W até 100%).
2. Com ~170 km/h, puxe o mouse para cima da tela para decolar.
3. Já no ar, recolha o trem (G) e os flaps (↑).
4. Siga a seta verde no canto superior direito até a pista 02.
5. Uns 2–3 km antes, reduza a potência (S). O avião tem inércia e demora a perder velocidade.
6. Baixe o trem (G) e os flaps em etapas (↓), vendo **ESTOL EM** cair no painel.
7. Pouse suave, freie com B e pare: **Missão cumprida**.

Se aparecer **ESTOL**, baixe o nariz e/ou acelere. Se aparecer **TREM RECOLHIDO**, aperte G.
No fim de cada pista há uma área circular para fazer o giro de 180° no chão.

## Para quem for mexer no código

Leia `CLAUDE.md`: arquitetura, modelo de física, decisões já tomadas e como testar.
