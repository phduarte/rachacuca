# Racha Cuca — Especificação do Produto (PWA)

> Quebra-cabeça deslizante (Jogo dos 15) para mobile, em tela cheia, com cara e som de console dos anos 80/90.

| Item | Valor |
|---|---|
| Versão do documento | 1.0 |
| Data | 2026-11-15 |
| Plataforma alvo | PWA instalável — Android (Chrome) e iOS (Safari 16.4+); desktop como secundário |
| Status | Proposta para desenvolvimento |

---

## 1. Visão geral

**Racha Cuca** é o clássico quebra-cabeça deslizante (também chamado de *Jogo do 15*, *Gem Puzzle*, *Boss Puzzle* ou *Game of Fifteen*) num app web progressivo. Instalado, ele abre como um app nativo: tela cheia, sem barra do navegador, funciona offline.

O tema é a nostalgia dos anos 80/90: paletas de consoles e micros da época, arte em pixel, fonte bitmap, tela de "PRESS START", efeito CRT opcional e sons sintetizados.

### 1.1 Objetivos
1. Sensação de app nativo no celular: abre rápido, fica em tela cheia, não rola nem dá zoom, responde ao toque em menos de um quadro.
2. Cada partida tem paleta, imagem e embaralhamento diferentes.
3. As peças parecem objetos físicos: o tabuleiro balança de leve e as peças estalam como acrílico.
4. A vitória é marcante: corrente elétrica pelas frestas das peças, terminando numa explosão elétrica.
5. O jogador pode montar o próprio banco de imagens, sem perder as imagens que vêm com o jogo.
6. Estatísticas e histórico das últimas partidas ficam salvos no aparelho.

### 1.2 Fora do escopo (v1)
- Multijogador, ranking online, contas de usuário, sincronização na nuvem.
- Compras ou anúncios.
- Solver automático visível ao jogador (pode entrar como "dica" na v2).

---

## 2. Regras do jogo

### 2.1 Componentes
- Moldura quadrada de **N × N** casas.
- **N² − 1** peças e **uma casa vazia**.
- Cada peça mostra um pedaço da imagem e, opcionalmente, um número (1 até N² − 1).

| Tamanho | Peças | Nome no jogo | Dificuldade |
|---|---|---|---|
| 3 × 3 | 8 | "Jogo do 8" | Fácil |
| 4 × 4 | 15 | "Jogo do 15" (padrão) | Médio |
| 5 × 5 | 24 | "Racha Cuca 24" | Difícil |
| 6 × 6 | 35 | "Insano" (desbloqueado ao vencer um 5 × 5) | Muito difícil |

### 2.2 Objetivo
Deixar as peças na ordem, da esquerda para a direita e de cima para baixo (1, 2, 3, …), com a casa vazia no **canto inferior direito**. Com imagem, isso remonta a figura.

### 2.3 Movimentos
1. Só se movem peças **vizinhas da casa vazia** (em cima, embaixo, à esquerda ou à direita). Diagonal não vale.
2. A peça desliza para a casa vazia, e a casa de onde saiu passa a ser a vazia.
3. **Deslize em fila:** ao tocar numa peça na mesma linha ou coluna da casa vazia, ela e todas as peças entre ela e a casa vazia deslizam juntas.
4. **Contagem:** cada peça deslocada conta como 1 movimento. Um deslize em fila de 3 peças vale 3 movimentos. Essa é a contagem do quebra-cabeça físico e deixa a comparação justa entre partidas.
5. As peças não saem da moldura, e não existe trocar duas peças de lugar diretamente.

### 2.4 Solubilidade (regra obrigatória do embaralhador)
Metade das arrumações possíveis **não tem solução**. Isso já foi provado por Johnson & Story (1879), e é o motivo de o famoso desafio "14-15" de Sam Loyd ser impossível. O embaralhador **nunca** pode gerar uma posição sem solução.

Considere *inversões* = pares de peças (a, b) em que a vem antes de b na leitura linha a linha, mas a > b (sem contar a casa vazia).

- **N ímpar (3, 5):** tem solução se e só se o número de inversões for **par**.
- **N par (4, 6):** tem solução se e só se *(inversões + linha da casa vazia contada de baixo para cima, começando em 1)* for **ímpar**.

Teste obrigatório: o tabuleiro resolvido tem que passar no próprio teste.

### 2.5 Fim de partida
- **Vitória:** todas as peças no lugar. O relógio para, a última peça (que estava faltando) aparece e o efeito de vitória toca (seção 7).
- **Abandono:** o jogador sai ou começa um novo jogo antes de terminar. Fica registrado como "abandonada" nas estatísticas.
- **Pausa:** o relógio para quando o app perde o foco (`visibilitychange`) ou quando o jogador toca em pausa. Na pausa o tabuleiro fica coberto, para não dar para estudar a posição com o tempo parado.

---

## 3. A cada novo jogo: paleta, imagem e embaralhamento

Toda partida nova sorteia três coisas, sem repetir as recentes.

### 3.1 Paletas clássicas
Cada paleta define tokens de cor aplicados por CSS custom properties em `:root`: `--bg`, `--frame`, `--tile-face`, `--tile-edge-light`, `--tile-edge-dark`, `--text`, `--accent`, `--glow`. A cor do raio da vitória (`--glow`) também vem da paleta.

| ID | Inspiração | Cores base (aprox.) |
|---|---|---|
| `cga-1` | PC CGA, modo 4 cores (ciano/magenta) | `#000000 #55FFFF #FF55FF #FFFFFF` |
| `cga-2` | PC CGA (verde/vermelho/amarelo) | `#000000 #55FF55 #FF5555 #FFFF55` |
| `dmg` | Portátil de tela verde | `#0F380F #306230 #8BAC0F #9BBC0F` |
| `nes` | Console 8 bits de 1985 | `#000000 #FCFCFC #F83800 #0058F8 #F8B800` |
| `c64` | Micro de 1982 (azul/lilás) | `#40318D #7869C4 #FFFFFF #A1683C` |
| `zx` | Micro britânico 8 bits | `#000000 #0000D7 #D70000 #00D700 #D7D700` |
| `msx` | Padrão MSX | `#000000 #5455ED #3EB849 #D4524D #CCC35E` |
| `amiga` | Workbench 1.x | `#0055AA #FFFFFF #000020 #FF8800` |
| `vga-sunset` | PC VGA / estética "synthwave" | `#1A0533 #FF2A6D #05D9E8 #FFD319` |
| `arcade-neon` | Fliperama de 1981 | `#000000 #FFFF00 #FF0000 #00FFFF #FFB8FF` |
| `beige-pc` | Gabinete bege + monitor fósforo âmbar | `#1B1200 #FFB000 #D9C8A9 #6B5B3E` |
| `16bit-blue` | Console 16 bits | `#1D2B53 #29ADFF #FFF1E8 #FF004D` |

Regras:
- Não repetir nenhuma das **3 últimas** paletas.
- Contraste mínimo de 4,5:1 entre `--text` e `--tile-face` (o número na peça precisa ser legível). Paletas que não chegam a isso ganham um contorno no texto.
- A troca de paleta tem transição de 300 ms com um "glitch" curto (deslocamento horizontal de 2 a 4 linhas, 80 ms), como trocar de canal na TV.
- O nome da paleta aparece por 1,5 s no topo ("PALETA: CGA MODO 1").
- `theme_color` / `<meta name="theme-color">` é atualizado para `--bg`, para a barra de status do Android acompanhar.

### 3.2 Imagem
- Sorteada entre as imagens **ativas** do banco (originais + do usuário, seção 4).
- Não repetir nenhuma das **5 últimas** (ou quantas houver, se o banco for menor).
- **Modo retrô** (opcional, padrão desligado): a imagem é reduzida a uma grade de pixels (ex.: 128 × 128) e **quantizada para a paleta da partida** com dithering Floyd–Steinberg ou Bayer 4 × 4. Assim a mesma imagem fica diferente a cada paleta, e fotos do usuário ficam com cara de jogo antigo. Com o modo desligado, a imagem aparece em cores originais.
- Opção "mostrar números" (padrão: ligada no 5 × 5 e 6 × 6, desligada no 3 × 3 e 4 × 4). O número fica num canto da peça em fonte bitmap.
- Botão "espiar" (segurar): mostra a imagem completa em transparência sobre o tabuleiro. Cada espiada conta nas estatísticas.

### 3.3 Embaralhamento
- **Algoritmo:** permutação aleatória (Fisher–Yates) com PRNG de semente (ex.: `mulberry32`). Se não tiver solução (seção 2.4), troca as duas primeiras peças que não sejam a casa vazia, o que inverte a paridade.
- **Qualidade mínima:** rejeitar e sortear de novo se
  - o tabuleiro sair resolvido, ou
  - mais de 25% das peças já estiverem no lugar, ou
  - a soma das distâncias de Manhattan ficar abaixo de um mínimo por tamanho (3 × 3: 10; 4 × 4: 30; 5 × 5: 60; 6 × 6: 100).
- **Semente:** gerada a cada partida (`crypto.getRandomValues`) e salva no registro. Isso permite reproduzir uma partida, depurar e, no futuro, ter um "desafio do dia".
- **Animação de embaralhar:** ao começar, as peças saem da posição resolvida e voam até a posição sorteada em 600–900 ms com atraso escalonado, junto com um som rápido de "chacoalhar" peças. É só visual: a posição inicial é a sorteada.

---

## 4. Imagens

### 4.1 Imagens originais do jogo (estilo anos 80/90)

O pedido é usar imagens de jogos da época. **Telas, sprites, personagens e logotipos de jogos comerciais (Nintendo, Sega, Atari, Namco, Capcom etc.) são protegidos por direito autoral e marca registrada.** Usá-los num app distribuído publicamente cria risco de remoção da loja ou notificação extrajudicial. Por isso:

- As imagens embarcadas são **arte original em pixel art que evoca os gêneros e o visual da época**, sem copiar personagens, cenários ou logotipos de nenhum jogo específico.
- Origem aceita: arte encomendada ou feita pela equipe, ou pacotes com licença explícita para uso comercial (CC0 / CC-BY com atribuição na tela "Créditos"). A licença de cada imagem fica registrada em `assets/images/LICENSES.md`.
- O usuário pode importar o que quiser para o **próprio** banco (seção 4.2). Essas imagens ficam só no aparelho dele e não são distribuídas pelo app.

**Pacote inicial (12 imagens, 512 × 512, PNG indexado):**

| # | Título | Gênero que evoca | Descrição |
|---|---|---|---|
| 1 | Invasão Orbital | Shooter espacial de fliperama | Fileiras de naves alienígenas pixeladas sobre um canhão, fundo estrelado |
| 2 | Labirinto Neon | Labirinto de fliperama | Corredores neon, bolinhas e fantasminhas originais |
| 3 | Castelo do Dragão | Plataforma 8 bits | Castelo no penhasco, nuvens em blocos, dragão no alto da torre |
| 4 | Rodovia ao Pôr do Sol | Corrida 16 bits | Estrada em perspectiva, palmeiras e um sol listrado |
| 5 | Masmorra 8 Bits | RPG de calabouço | Herói com espada diante de uma porta com tochas |
| 6 | Blocos em Queda | Puzzle de encaixe | Poço com blocos coloridos caindo |
| 7 | Rua dos Lutadores | Luta / beat 'em up | Dois lutadores originais numa rua com néon |
| 8 | Floresta Encantada | Aventura | Clareira com cogumelos, cachoeira e um baú |
| 9 | Ninja do Telhado | Ação | Silhueta de ninja diante da lua cheia sobre telhados |
| 10 | Kart na Pista | Corrida de kart | Visão de cima de uma pista com zebras |
| 11 | Fliperama | O lugar | Fileira de gabinetes de fliperama com telas acesas |
| 12 | Quarto dos Anos 90 | A época | TV de tubo, console genérico, fitas e cartuchos sem marca |

As imagens precisam ser legíveis mesmo cortadas em 36 pedaços (6 × 6): formas grandes, contraste alto, poucos detalhes finos.

### 4.2 Banco de imagens do usuário

**Funções:**
1. **Adicionar:** escolher da galeria ou tirar foto (`<input type="file" accept="image/*" capture>`). Vários arquivos de uma vez.
2. **Recortar:** tela de recorte quadrado com arrastar e pinça. Prévia ao vivo no modo retrô com a paleta atual.
3. **Normalizar:** redimensionar para no máximo 1024 × 1024 e gravar como WebP (qualidade 0,85) ou JPEG se o navegador não suportar WebP. Gerar miniatura de 128 × 128.
4. **Organizar:** renomear, ligar/desligar na rotação, apagar.
5. **Backup:** exportar o banco do usuário para um `.zip` (imagens + `manifest.json`) e importar de volta.

**Regras:**
- As **imagens originais não podem ser apagadas.** Na galeria elas têm um selo "ORIGINAL" e não mostram o botão de excluir. Podem ser **desligadas** da rotação.
- Pelo menos **1 imagem precisa estar ativa**. Ao tentar desligar a última, mostrar aviso e bloquear.
- Limite de 100 imagens do usuário. Ao chegar perto do limite de armazenamento (`navigator.storage.estimate()` acima de 80%), avisar.
- Pedir `navigator.storage.persist()` na primeira importação, para o navegador não apagar o banco por falta de espaço.
- Apagar pede confirmação ("APAGAR ESTA IMAGEM? SIM / NÃO").
- Se a imagem apagada estiver em uso numa partida salva, a partida continua com uma cópia em cache até terminar.

**Galeria:** grade de miniaturas, filtro "Todas / Originais / Minhas", contador "12 + 7 imagens · 15 ativas".

---

## 5. Controles e interação

| Entrada | Ação |
|---|---|
| Toque numa peça vizinha da casa vazia | Move a peça |
| Toque numa peça na mesma linha/coluna da casa vazia | Deslize em fila (seção 2.3) |
| Swipe sobre o tabuleiro (cima/baixo/esq/dir) | Move para a casa vazia a peça que está do lado oposto ao sentido do swipe |
| Arrastar uma peça | A peça segue o dedo no eixo permitido; ao soltar, completa o movimento se passou de 40% do caminho, senão volta |
| Setas do teclado / WASD (desktop) | Igual ao swipe |
| Segurar o botão "olho" | Espiar a imagem completa |
| `Esc` / botão voltar do Android | Pausa (não sai do app) |

- **Entrada durante animação:** fica numa fila de até 2 comandos, para que jogadores rápidos não percam toques.
- **Resposta:** a animação começa no mesmo quadro do `pointerdown`/`pointerup`. Usar Pointer Events com `touch-action: none` no tabuleiro.
- **Duração do deslize:** 110 ms, curva `cubic-bezier(.2,.9,.3,1.2)` (um pequeno passo além do fim, como algo físico).

---

## 6. Resposta física: balanço e estalo

### 6.1 Balanço do tabuleiro
A cada movimento, o tabuleiro inteiro dá um tranco leve **no sentido do deslize**, como se o impacto da peça empurrasse a moldura.

- Deslocamento: 2 px (3 px num deslize em fila de 3 peças ou mais) no sentido do movimento, mais uma rotação de ±0,3°.
- Retorno amortecido em 180 ms (mola: `transform` com keyframes 0 → +2px → −1px → 0).
- Disparo no **fim** do deslize da peça (o impacto), junto com o som.
- Usar apenas `transform`, para rodar na GPU sem relayout.
- Vibração no Android: `navigator.vibrate(8)` no impacto, se a opção "vibração" estiver ligada. O iOS não suporta a API, e isso é esperado.
- Com `prefers-reduced-motion: reduce`, o balanço é desligado. O som continua.

### 6.2 Som de estalo (acrílico)
Um "tic" curto e baixo, como duas peças de acrílico se tocando, tocado **quando o deslize termina**.

- **Síntese via Web Audio API**, sem arquivo, para latência mínima e para variar a cada toque:
  1. Rajada de ruído branco de 15 ms → filtro passa-banda centrado em 3,2 kHz (Q ≈ 8) → envelope de ataque 1 ms e queda exponencial de 25 ms.
  2. Mais uma senoide de 1,9 kHz com queda de 40 ms, em −12 dB em relação ao ruído (dá o "corpo" do acrílico).
  3. Variação aleatória de ±6% na frequência e ±2 dB no volume a cada toque, para não soar como o mesmo som repetido.
- **Volume:** baixo, por volta de −24 dBFS de pico. Controle de volume geral nas configurações.
- **Deslize em fila:** um estalo por peça, espaçados 18 ms, com volume caindo 15% a cada um.
- **Destravar áudio:** criar e dar `resume()` no `AudioContext` no primeiro toque (exigência do iOS e do Chrome).
- Alternativa: se a síntese não convencer nos testes, gravar 4 variações reais (peças de acrílico de verdade), exportar como `.ogg`/`.m4a` de menos de 5 KB cada e tocar via `AudioBuffer` pré-carregado.

### 6.3 Outros sons
| Evento | Som |
|---|---|
| Toque em peça que não pode mexer | "tunc" grave e abafado, 60 ms |
| Embaralhar | Chacoalhar de várias peças (sequência de 12 estalos aleatórios em 600 ms) |
| Navegar no menu | Bipe de onda quadrada, 1 kHz, 30 ms |
| Vitória | Zumbido elétrico crescente → estalos de faísca → explosão (seção 7) |
| Música (opcional, padrão desligada) | Chiptune em loop com ondas quadrada/triângulo/ruído, volume −30 dB |

---

## 7. Efeito de vitória: luz neon percorrendo o tabuleiro

Duração total de cerca de 2,8 s. Um toque na tela pula para o resultado. (Na primeira versão era uma corrente elétrica pelas frestas terminando numa explosão; foi trocada por luz neon.)

### 7.1 Sequência

| Tempo | Fase | O que acontece |
|---|---|---|
| 0 – 300 ms | Encaixe | A última peça aparece na casa vazia com um estalo mais forte. O tabuleiro dá um tranco de 4 px. As frestas entre as peças escurecem e a tela em volta do tabuleiro escurece. |
| 300 – 1100 ms | Contorno | Dois cometas de neon saem do canto inferior direito (onde a última peça entrou), um subindo pela direita e outro correndo pela base, e se encontram no canto superior esquerdo, deixando o contorno do tabuleiro aceso. |
| 900 – 1900 ms | Varredura | As linhas da grade (as frestas) acendem em neon na diagonal, a partir do canto da última peça, até cobrir o tabuleiro todo. |
| 1900 – 2300 ms | Aceso | O tabuleiro inteiro brilha: a intensidade sobe e desce uma única vez (sem pisca-pisca). Vibração curta no Android. |
| 2300 – 2800 ms | Assentamento | O neon apaga, as frestas fecham e a imagem completa aparece sem emendas. O painel de resultado sobe. |

### 7.2 Implementação
- `<canvas>` sobreposto ao tabuleiro, do tamanho da viewport, com `devicePixelRatio` limitado a 2.
- **Neon:** cada traço é desenhado três vezes com `globalCompositeOperation = 'lighter'`: halo largo (cor da paleta, opacidade baixa, `shadowBlur` 18), tubo colorido e núcleo branco fino. Contorno na cor `--accent`, grade na cor `--glow`.
- **Grade:** segmentos de uma casa nas linhas internas; a ordem de cada um na varredura é a distância de Manhattan até o canto inferior direito.
- **Som:** estalos do reator do neon ligando, zumbido de 120 Hz, arpejo chiptune subindo enquanto a luz corre e um acorde quando o tabuleiro acende todo.
- **Vibração (Android):** padrão `[30, 60, 30]` quando o tabuleiro acende.

### 7.3 Desempenho e acessibilidade
- Meta: 60 fps num aparelho intermediário de 2022. Se os primeiros quadros passarem de 20 ms, cair para o **modo leve** (sem `shadowBlur`).
- Com `prefers-reduced-motion: reduce`: sem tranco nem cometas. O contorno e a grade acendem em sequência com brilho suave e apagam.
- **Segurança contra fotossensibilidade:** nada pisca; o brilho sobe e desce uma única vez, e "NOVO RECORDE!" pisca a 1 Hz (abaixo de 3 vezes por segundo, WCAG 2.3.1).

### 7.4 Painel de resultado
"VOCÊ RACHOU A CUCA!" em fonte pixel, com: tempo, movimentos, espiadas, comparação com o recorde do tamanho ("NOVO RECORDE!" piscando, se for o caso) e botões **NOVO JOGO** / **MENU**.

---

## 8. Estatísticas e progresso

### 8.1 O que é salvo
- **Partida em andamento:** salva a cada movimento (com debounce de 300 ms) e quando o app perde o foco. Ao reabrir, o jogo pergunta "CONTINUAR PARTIDA?".
- **Histórico:** as **últimas 100 partidas** (concluídas ou abandonadas). Ao passar disso, as mais antigas são apagadas, mas os **totais e recordes continuam** (são guardados à parte).
- **Totais e recordes por tamanho**, atualizados ao fim de cada partida.

### 8.2 Tela de estatísticas
Abas por tamanho (3 × 3 / 4 × 4 / 5 × 5 / 6 × 6 / Todos).

| Indicador | Detalhe |
|---|---|
| Partidas jogadas / concluídas | Mais a taxa de conclusão |
| Melhor tempo | Com data e miniatura da imagem |
| Menos movimentos | Com data |
| Média de tempo e de movimentos | Das últimas 10 partidas concluídas |
| Sequência atual / maior sequência | Partidas concluídas em seguida, sem abandonar |
| Tempo total jogado | — |
| Gráfico | Barras pixeladas com o tempo das últimas 20 partidas, a melhor destacada |
| Lista | Últimas partidas: data, tamanho, tempo, movimentos, situação, miniatura da imagem e cor da paleta |

- Tocar numa partida da lista mostra os detalhes e o botão **JOGAR DE NOVO** (mesma semente, imagem e tamanho).
- Botões **Exportar** (JSON) e **Zerar estatísticas** (com confirmação dupla).

---

## 9. Experiência PWA nativa e tela cheia

### 9.1 Manifest (`manifest.webmanifest`)
```json
{
  "name": "Racha Cuca",
  "short_name": "Racha Cuca",
  "start_url": "/?source=pwa",
  "scope": "/",
  "display": "fullscreen",
  "display_override": ["fullscreen", "standalone"],
  "orientation": "portrait",
  "background_color": "#000000",
  "theme_color": "#000000",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "categories": ["games", "puzzle"]
}
```

### 9.2 HTML e CSS
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon-180.png">
```
- Telas de abertura para iOS (`apple-touch-startup-image`) nos tamanhos principais de iPhone, geradas no build.
- `html, body { position: fixed; inset: 0; overflow: hidden; overscroll-behavior: none; }`, para não ter "puxar para atualizar" nem rolagem elástica.
- `touch-action: none` no tabuleiro e `manipulation` no resto, sem atraso de toque e sem zoom por toque duplo.
- `user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent`.
- Bloquear `contextmenu` e `gesturestart` (pinça do iOS).
- Margens seguras: `padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)`.
- Usar `100dvh` (não `100vh`) para a altura.

### 9.3 Comportamento em tempo de execução
- **Tela cheia:** no navegador comum (não instalado), o primeiro toque em "PRESS START" chama `document.documentElement.requestFullscreen({ navigationUI: 'hide' })` no Android. No iOS a API não existe para páginas, então a tela cheia só vem com o app instalado (`display` do manifest).
- **Orientação:** `screen.orientation.lock('portrait')` quando em tela cheia (Android). Se o aparelho estiver deitado e a trava não funcionar, mostrar "GIRE O APARELHO" em pixel art.
- **Tela acesa:** `navigator.wakeLock.request('screen')` durante a partida. Soltar na pausa e pedir de novo ao voltar o foco.
- **Botão voltar do Android:** interceptar com `history.pushState` + `popstate` para pausar em vez de fechar o app.
- **Instalação:** capturar `beforeinstallprompt` e mostrar um botão "INSTALAR" no menu. No iOS, mostrar um guia curto ("Toque em Compartilhar → Adicionar à Tela de Início") uma única vez.

### 9.4 Offline e atualização
- Service worker (Workbox via `vite-plugin-pwa`):
  - **Pré-cache** de todo o shell: HTML, JS, CSS, fonte, ícones e as 12 imagens originais. O jogo inteiro funciona offline desde a primeira visita.
  - Imagens do usuário ficam no IndexedDB, não no cache do service worker.
- **Atualização:** estratégia `prompt`. Quando houver versão nova, mostrar "NOVA VERSÃO! REINICIAR?" no menu, nunca no meio de uma partida.

---

## 10. Visual e telas

### 10.1 Identidade
- **Fonte:** "Press Start 2P" (licença SIL OFL), hospedada junto com o app (sem Google Fonts em tempo de execução, por causa do offline). Tamanhos em múltiplos de 8 px.
- **Renderização pixelada:** `image-rendering: pixelated` nas imagens e nas texturas das peças.
- **Peças:** quadrados com chanfro 3D de 3 px (borda clara em cima/esquerda, escura embaixo/direita, cores da paleta) e um reflexo diagonal sutil (gradiente branco a 8%) para lembrar acrílico. Frestas de 2–3 px entre as peças (são o caminho da corrente na vitória).
- **Efeito CRT (opcional, padrão desligado):** linhas de varredura (gradiente repetido de 2 px a 6% de opacidade), vinheta nas bordas e leve aberração cromática nos textos. Ligável nas opções.

### 10.2 Telas

| Tela | Conteúdo |
|---|---|
| **Abertura** | Logo "RACHA CUCA" montado peça por peça, "PRESS START" piscando (1 Hz), "© 19XX" de brincadeira. O toque aqui destrava áudio, tela cheia e wake lock. |
| **Menu** | CONTINUAR (se houver partida salva) · NOVO JOGO · TAMANHO (3/4/5/6) · IMAGENS · ESTATÍSTICAS · OPÇÕES · INSTALAR |
| **Jogo** | Topo: tempo, movimentos, pausa. Centro: tabuleiro quadrado (lado = menor entre largura − 32 px e 70% da altura). Base: botão espiar, miniatura da imagem, novo jogo. |
| **Pausa** | Tabuleiro coberto, CONTINUAR · REINICIAR · MENU |
| **Vitória** | Efeito (seção 7) + painel de resultado |
| **Imagens** | Galeria (seção 4.2) |
| **Estatísticas** | Seção 8.2 |
| **Opções** | Volume de efeitos, música, vibração, efeito CRT, modo retrô das imagens, mostrar números, movimento reduzido (sobrepõe o do sistema), créditos e licenças |

Todas as telas trocam com uma transição de "desligar o tubo": a imagem se fecha numa linha horizontal e depois num ponto, em 250 ms.

---

## 11. Arquitetura técnica

### 11.1 Stack
- **TypeScript + Vite**, sem framework pesado. A interface é pequena; DOM direto ou **Preact** (~4 KB) para menus e telas.
- **Tabuleiro:** cada peça é um `<div>` posicionado por `transform: translate3d()`, com a imagem de fundo e `background-position` mostrando seu pedaço. É mais simples e nítido que desenhar o tabuleiro todo em canvas e já sai acelerado pela GPU.
- **Efeitos:** `<canvas>` 2D sobreposto (vitória, faíscas, glitch).
- **Áudio:** Web Audio API, um `AudioContext` só para o app inteiro.
- **Persistência:** IndexedDB via `idb` (~1 KB). `localStorage` só para opções pequenas.
- **PWA:** `vite-plugin-pwa` (Workbox).
- **Testes:** Vitest (lógica), Playwright (fluxos em viewport de celular).

### 11.2 Módulos

```
src/
  core/
    board.ts        # estado, movimentos válidos, deslize em fila, verificação de vitória
    shuffle.ts      # PRNG com semente, Fisher–Yates, teste de solubilidade, critérios de qualidade
    timer.ts        # relógio com pausa, baseado em performance.now()
  render/
    boardView.ts    # DOM das peças, animações, balanço do tabuleiro
    input.ts        # toque, swipe, arrastar, teclado, fila de comandos
    victoryFx.ts    # canvas: grafo das frestas, raios, partículas, explosão
    crt.ts          # linhas de varredura, glitch, transição de tela
  theme/
    palettes.ts     # definição das paletas e sorteio sem repetir
    retroize.ts     # redução de pixels + quantização + dithering (em Web Worker)
  audio/
    sfx.ts          # síntese do estalo, "tunc", bipes, som da vitória
    music.ts        # chiptune opcional
  data/
    db.ts           # esquema e migrações do IndexedDB
    images.ts       # banco de imagens: importar, recortar, normalizar, listar
    stats.ts        # histórico, totais, recordes
    session.ts      # salvar/retomar a partida em andamento
  pwa/
    fullscreen.ts   # tela cheia, orientação, wake lock, botão voltar
    install.ts      # convite para instalar
  ui/
    screens/        # abertura, menu, jogo, pausa, vitória, imagens, estatísticas, opções
  main.ts
public/
  manifest.webmanifest
  icons/  fonts/  images/originals/
```

- `retroize.ts` roda num **Web Worker** com `OffscreenCanvas`, para o processamento da imagem não travar a animação. O resultado fica em cache por (imagem, paleta, tamanho).
- `core/` não depende de DOM. É lógica pura e 100% testável.

### 11.3 Modelos de dados (IndexedDB `racha-cuca`, versão 1)

```ts
// store: images (chave: id)
interface ImageEntry {
  id: string;               // "orig-01" ... ou uuid
  source: 'original' | 'user';
  title: string;
  blob?: Blob;              // só para 'user'; originais vêm de /images/originals/
  thumb: Blob;
  width: number;
  height: number;
  enabled: boolean;         // participa do sorteio
  createdAt: number;
  license?: string;         // originais: texto da licença/autor
}

// store: games (chave: id, índice: finishedAt, size)
interface GameRecord {
  id: string;
  size: 3 | 4 | 5 | 6;
  seed: number;
  imageId: string;
  paletteId: string;
  initialTiles: number[];   // posição inicial (0 = casa vazia)
  status: 'won' | 'abandoned';
  moves: number;
  timeMs: number;
  peeks: number;
  startedAt: number;
  finishedAt: number;
}

// store: session (chave fixa "current")
interface SavedSession {
  game: Omit<GameRecord, 'status' | 'finishedAt'>;
  tiles: number[];          // posição atual
  elapsedMs: number;
}

// store: aggregates (chave: size | 'all')
interface Aggregates {
  key: string;
  played: number;
  won: number;
  bestTimeMs?: number;  bestTimeGameId?: string;
  bestMoves?: number;   bestMovesGameId?: string;
  totalTimeMs: number;
  currentStreak: number;
  bestStreak: number;
}

// store: meta (chave: string)
// recentPalettes: string[], recentImages: string[], schemaVersion, installHintShown...
```

---

## 12. Requisitos não funcionais

| Requisito | Meta |
|---|---|
| Primeiro carregamento (4G, celular intermediário) | Interativo em menos de 2,5 s |
| Abrir instalado / offline | Menos de 1 s até a tela de abertura |
| JS inicial | Até 80 KB gzip (sem contar imagens e fonte) |
| Taxa de quadros | 60 fps no deslize e no balanço; 50+ fps no efeito de vitória (modo leve como reserva) |
| Latência do toque ao início da animação | Menos de 16 ms |
| Latência do fim do deslize ao som | Menos de 20 ms |
| Lighthouse PWA / Performance | Instalável; Performance acima de 90 |
| Compatibilidade | Chrome Android 110+, Safari iOS 16.4+, Samsung Internet 20+, Chrome/Edge/Firefox desktop atuais |
| Privacidade | Nada sai do aparelho. Sem analytics de terceiros na v1. |

### 12.1 Acessibilidade
- Respeitar `prefers-reduced-motion` (balanço, tremor, glitch, CRT e efeito de vitória em versão suave).
- Opção "mostrar números" sempre disponível, para quem tem dificuldade em distinguir partes da imagem.
- Peças com `role="button"` e `aria-label="Peça 7, linha 2, coluna 3"`. Anunciar a vitória via `aria-live`.
- Botões com área de toque de pelo menos 44 × 44 px.
- Nenhum clarão acima de 3 por segundo (seção 7.3).

---

## 13. Critérios de aceitação

**Regras e embaralhamento**
- [ ] Em 100.000 embaralhamentos por tamanho, 100% têm solução (verificado pelo teste de paridade e, para 3 × 3, por busca exaustiva).
- [ ] Nenhum embaralhamento sai resolvido ou abaixo dos limites de qualidade da seção 3.3.
- [ ] A mesma semente gera sempre a mesma posição inicial.
- [ ] Deslize em fila move todas as peças entre a tocada e a casa vazia e conta 1 movimento por peça.
- [ ] Toque em peça fora da linha/coluna da casa vazia não move nada e toca o "tunc".

**Variedade**
- [ ] Partidas seguidas nunca repetem a paleta das 3 anteriores nem a imagem das 5 anteriores (quando o banco permite).
- [ ] `theme-color` acompanha a paleta.

**Banco de imagens**
- [ ] Imagens originais não têm opção de apagar, nem pela interface nem por chamada direta à função (`images.delete` rejeita `source: 'original'`).
- [ ] Não é possível desligar a última imagem ativa.
- [ ] Imagem importada, recortada e normalizada continua disponível depois de fechar e reabrir o app, inclusive offline.
- [ ] Exportar e importar o `.zip` restaura o banco do usuário.

**Resposta física**
- [ ] Cada movimento produz um balanço do tabuleiro no sentido do deslize e um estalo ao final.
- [ ] Com movimento reduzido, não há balanço e o som continua.

**Vitória**
- [ ] A luz neon começa no canto da última peça e percorre o contorno e todas as frestas antes do assentamento.
- [ ] Um toque pula o efeito direto para o resultado.
- [ ] O efeito roda a 50+ fps ou cai sozinho para o modo leve.

**Estatísticas**
- [ ] Fechar o app no meio de uma partida e reabrir oferece continuar, com tempo e posição corretos.
- [ ] O histórico guarda as últimas 100 partidas, e os recordes continuam depois que as antigas são apagadas.
- [ ] "Jogar de novo" recria a mesma partida (semente, imagem e tamanho).

**PWA**
- [ ] Instalado no Android: abre sem barra do navegador nem barra de status, em retrato.
- [ ] Instalado no iOS: abre em tela cheia respeitando o notch e a barra inferior.
- [ ] Sem "puxar para atualizar", rolagem elástica, zoom por pinça ou menu de toque longo.
- [ ] Modo avião: o jogo abre e funciona por completo.
- [ ] O botão voltar do Android pausa a partida em vez de fechar o app.

---

## 14. Plano de entrega

| Fase | Entrega | Inclui |
|---|---|---|
| **1. Núcleo** | Jogo jogável | `core/` com testes, tabuleiro em DOM, toque/swipe/teclado, 4 × 4 com números, relógio e contador |
| **2. Sensação** | Jogo "físico" | Animação de deslize, balanço, estalo sintetizado, embaralhamento animado |
| **3. Visual retrô** | Cara de anos 80/90 | Paletas, fonte, CRT, telas de abertura e menu, 12 imagens originais, `retroize` no worker |
| **4. PWA** | App instalável | Manifest, service worker, tela cheia, orientação, wake lock, botão voltar, convite de instalação |
| **5. Dados** | Progresso salvo | IndexedDB, partida em andamento, histórico, recordes, tela de estatísticas |
| **6. Banco de imagens** | Personalização | Importar, recortar, galeria, ligar/desligar, backup |
| **7. Vitória** | Final marcante | Luz neon, som, modo leve, versão de movimento reduzido |
| **8. Polimento** | Lançamento | Testes em aparelhos reais (Android simples, iPhone), acessibilidade, Lighthouse, créditos e licenças |

---

## 15. Pontos em aberto
1. **Arte original:** quem produz as 12 imagens (equipe, freelancer ou pacote CC0)? É o item que mais pesa no prazo da fase 3.
2. **Estalo:** síntese ou gravação real? Recomendo prototipar a síntese na fase 2 e só gravar se não ficar convincente em aparelho real.
3. **Contagem de movimentos:** o documento adota "1 por peça deslocada". Se preferirem "1 por gesto", basta mudar a regra em `board.ts`, mas os recordes de versões anteriores deixam de ser comparáveis.
4. **6 × 6:** manter como desbloqueável ou liberar desde o início?

---

## Referências
- [N-puzzle / 15 puzzle — Wikipédia](https://wikipedia.com/wiki/N-puzzle)
- [Sliding puzzle — Wikipédia](https://wikipedia.com/wiki/Slider_puzzle)
- [Como verificar se uma instância do 15 puzzle tem solução — GeeksforGeeks](https://www.geeksforgeeks.org/?p=137557)
- [Paridade e o problema 14-15 de Sam Loyd — Stanford CS](https://cs64.stanford.edu/1116.pdf)
- [Racha Cuca (versão 5 × 5 com peças 1–24) — itch.io](https://gamesterabyte.itch.io/racha-cuca)
- [Jogo do 15 — regras do deslize em fila — Valor Final](https://valorfinal.com.br/jogos/jogo-do-15)
