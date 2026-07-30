# Como adicionar mais sprites (personagens)

Este guia explica como acrescentar novos personagens ao overlay. Cada usuário da
live recebe um personagem fixo (sorteado por hash do nome), então quanto mais
personagens no roster, mais variedade na tela.

## Como funciona hoje

- Cada personagem é uma animação de **caminhada**. O padrão são **2 quadros**, mas
  dá pra ter mais (veja [Quadros por personagem](#quadros-por-personagem)).
- **Cada personagem tem sua própria pasta**, com os quadros numerados dentro dela:
  `<nome>/1.png`, `<nome>/2.png`, … `<nome>/N.png`.
- As pastas ficam em [`src/overlay/assets/characters/`](../src/overlay/assets/characters/).
- A lista de personagens vive no array `PERSONAGENS` em
  [`src/overlay/characters.js`](../src/overlay/characters.js).
- Na tela cada personagem vira um `PIXI.AnimatedSprite` que alterna os quadros.

Estrutura da pasta:

```
src/overlay/assets/characters/
├─ hero/
│  ├─ 1.png
│  └─ 2.png
├─ robo/          ← exemplo de 4 quadros
│  ├─ 1.png
│  ├─ 2.png
│  ├─ 3.png
│  └─ 4.png
└─ ...            ← uma pasta por personagem
```

O `PIXI.Assets.load` pré-carrega **todos** os PNGs de todos os personagens de uma
vez (em `carregarPersonagens()`), antes de qualquer avatar ser criado.

## Requisitos dos arquivos de imagem

| Requisito     | Valor                                                                                                       |
| ------------- | ----------------------------------------------------------------------------------------------------------- |
| Formato       | PNG com transparência                                                                                       |
| Tamanho       | Livre — o padrão dos assets atuais é **16 × 16 px**. Veja [Sprites maiores](#sprites-maiores-tamanho-livre) |
| Quadros       | 2 por padrão; quantos você quiser via override                                                              |
| Estilo        | Pixel art (o overlay usa `scaleMode: 'nearest'` para não borrar)                                            |
| Enquadramento | Personagem "em pé", pés na base da imagem                                                                   |
| Organização   | Uma pasta por personagem; quadros como `1.png` … `N.png`                                                    |
| Consistência  | **Todos os quadros do mesmo personagem** com o mesmo tamanho                                                |

> **Por que os pés na base?** O avatar usa `anchor.set(0.5, 1)`, ou seja a origem
> do sprite é o **centro-inferior**. Isso garante que todos os personagens "pisem"
> na mesma linha do chão, independente da altura do desenho dentro do quadro —
> vale para sprites de qualquer tamanho.

### Sprites maiores (tamanho livre)

**Não precisa ser 16×16.** Esse é só o tamanho dos assets atuais. O PixiJS
renderiza o PNG no tamanho nativo dele, multiplicado por uma escala.

O que você precisa saber:

- Existe uma **escala global** `ESCALA = 4` em `characters.js`. Ela amplia _todo_
  personagem por igual: um PNG 16×16 vira 64px; um PNG 32×32 viraria 128px.
- Para um personagem de tamanho diferente **não ficar gigante/minúsculo** perto
  dos outros, dê uma **escala só pra ele** no mapa `ESCALAS`
  ([Escala por personagem](#escala-por-personagem)). Ex.: um PNG 32×32 com
  `ESCALAS = { dragao: 2 }` também renderiza a 64px, igual aos de 16×16.
- Todos os quadros de um mesmo personagem precisam ter o **mesmo tamanho** (o
  `AnimatedSprite` troca as texturas mantendo âncora e escala).
- Se usar arte que **não** é pixel art (um sprite em alta resolução), o
  `scaleMode: 'nearest'` — ótimo pra pixel art — pode deixar as bordas
  "serrilhadas". Nesse caso troque para `'linear'` no loop de
  `carregarPersonagens()`.

## Passo a passo (personagem simples, 2 quadros)

### 1. Crie a pasta do personagem com os quadros

Exemplo, adicionando um personagem chamado `ninja`:

```
src/overlay/assets/characters/ninja/1.png
src/overlay/assets/characters/ninja/2.png
```

### 2. Registre o nome no roster

Abra [`src/overlay/characters.js`](../src/overlay/characters.js) e adicione o
nome (só o nome da pasta) ao array `PERSONAGENS`:

```js
export const PERSONAGENS = [
  "hero",
  "cap",
  "dog",
  "frog",
  "girl",
  "hood",
  "kid",
  "miner",
  "oldwoman",
  "sage",
  "woman",
  "robo", // exemplo de 4 quadros (já incluso no repo)
  "ninja", // <- novo
];
```

Isso é tudo que o código precisa para um personagem de 2 quadros: `urls()` monta
os caminhos `assets/characters/ninja/1.png` e `/2.png` automaticamente,
`carregarPersonagens()` pré-carrega, e `personagemDoUsuario()` passa a poder
sortear `ninja`.

### 3. Recarregue o overlay

Reinicie/atualize a fonte do OBS (ou recarregue a página do overlay). Não há build:
o PixiJS é carregado por CDN e os arquivos são servidos estaticamente.

### 4. (Opcional) Confira

```powershell
npm test
```

O teste em [`tests/characters.test.js`](../tests/characters.test.js) verifica que
`personagemDoUsuario()` sempre devolve um nome que está em `PERSONAGENS` — ele se
adapta sozinho ao novo tamanho da lista, sem precisar editar o teste.

## Quadros por personagem

> O repo já inclui **`robo`** como exemplo funcional de 4 quadros
> (`robo/1.png` … `robo/4.png` + `QUADROS = { robo: 4 }`). Use-o como referência.

Cada personagem pode ter um número diferente de quadros. Isso é controlado pelo
mapa `QUADROS` em `characters.js` — você **só lista quem foge do padrão** (2):

```js
const PADRAO_QUADROS = 2; // usado por quem não está no mapa QUADROS

const QUADROS = {
  robo: 4, // usa robo/1.png ... robo/4.png
  dragao: 6, // usa dragao/1.png ... dragao/6.png
};
```

A função `urls()` gera automaticamente a quantidade certa de caminhos:

```js
function urls(nome) {
  return Array.from(
    { length: quadrosDe(nome) },
    (_, i) => `assets/characters/${nome}/${i + 1}.png`,
  );
}
```

Regras:

- Os arquivos precisam existir **numerados de 1 até N** sem buracos
  (`robo/1.png`, `robo/2.png`, `robo/3.png`, `robo/4.png`). Se o `QUADROS` diz 4
  mas só há 3 arquivos, o carregamento falha ao tentar buscar o quadro que falta.
- Personagens fora do mapa `QUADROS` continuam com 2 quadros, sem precisar de nada.
- A velocidade da animação (`VELOCIDADE_ANIM`) é global; todos os personagens
  trocam de quadro no mesmo ritmo, independente de quantos quadros têm.

## Escala por personagem

Se um personagem tem PNG de tamanho diferente (ou você quer ele maior/menor de
propósito), use o mapa `ESCALAS` — também só lista quem foge do padrão (`ESCALA = 4`):

```js
const ESCALA = 4; // escala padrão (16px -> 64px)

const ESCALAS = {
  dragao: 2, // PNG 32x32 * 2 = 64px, igual aos de 16x16
  chefe: 6, // um "boss" propositalmente maior
};
```

O avatar aplica `sprite.scale.set(escalaDe(nome))`, então cada personagem pode ter
sua própria escala mantendo os pés na mesma linha do chão.

## Direção que a arte olha (espelhamento)

O avatar anda pros **dois lados**. Se a arte é lateral (olhando pra um lado fixo),
sem tratamento ela parece "andar de costas" ao ir pro outro lado. O código resolve
**espelhando o sprite** (`scale.x` negativo) na direção do movimento.

Você diz pra que lado a **arte** foi desenhada no mapa `OLHANDO` — só lista quem
não é de frente:

```js
const OLHANDO = {
  "link-minish-cap": "esquerda", // arte lateral olhando pra esquerda
};
```

Valores:

| Valor        | Quando usar                                            | Espelha?                   |
| ------------ | ------------------------------------------------------ | -------------------------- |
| `"frente"`   | **Padrão.** Arte de frente/simétrica (ansimuz, `robo`) | Nunca (não faz sentido)    |
| `"esquerda"` | Arte lateral desenhada olhando pra **esquerda** (Link) | Vira ao andar pra direita  |
| `"direita"`  | Arte lateral desenhada olhando pra **direita**         | Vira ao andar pra esquerda |

Assim a mesma folha de caminhada serve pros dois sentidos — não precisa desenhar os
dois lados. (Para sprites com uma sheet separada de frente/parado, veja
[Ideias futuras](#ideias-futuras).)

## Checklist rápido

- [ ] Pasta `src/overlay/assets/characters/<nome>/` com `1.png` … `N.png`,
      numerados de 1 até N sem buracos
- [ ] PNG com transparência, pés na base, todos os quadros do mesmo tamanho
- [ ] `<nome>` adicionado ao array `PERSONAGENS` em `characters.js`
- [ ] Se tiver ≠ de 2 quadros: entrada em `QUADROS`
- [ ] Se o PNG não for 16×16: entrada em `ESCALAS`
- [ ] Se a arte for lateral (não de frente): entrada em `OLHANDO`
- [ ] Nome em minúsculo, sem espaços, batendo exatamente com o nome da pasta
- [ ] `npm test` passou
- [ ] O overlay foi recarregado e o personagem aparece

## Erros comuns

| Sintoma                                    | Causa provável                                                                          |
| ------------------------------------------ | --------------------------------------------------------------------------------------- |
| Personagem some / aparece como caixa vazia | Nome no `PERSONAGENS` não bate com a pasta, ou falta algum quadro `1..N.png`            |
| Erro ao carregar (404 de um PNG)           | `QUADROS[nome]` maior que a quantidade real de arquivos, ou numeração com buraco        |
| Sprite borrado / desfocado                 | Não é pixel art nítido; ou arte em alta-res com `scaleMode: 'nearest'` (use `'linear'`) |
| Personagem "flutuando" ou afundado no chão | Desenho não está com os pés na base do quadro                                           |
| Personagem gigante ou minúsculo            | Tamanho do PNG ≠ 16×16 sem ajustar `ESCALAS` (a `ESCALA` global amplia tudo por igual)  |
| Não anima (fica parado num quadro)         | Quadros idênticos, ou só existe um dos arquivos                                         |
| Andando "de costas" ao ir pra um lado      | Arte lateral sem entrada em `OLHANDO` (defina `'esquerda'` ou `'direita'`)              |

## Casos avançados

### Usar um spritesheet em vez de PNGs soltos

Para muitos personagens, um único spritesheet (atlas) reduz o número de arquivos e
requisições. O PixiJS carrega spritesheets via `Assets.load` de um `.json` +
imagem. Isso exigiria trocar a estratégia de `carregarPersonagens()` e o cache de
texturas. Só vale a pena se o roster crescer bastante.

### Parâmetros globais de animação

Em `characters.js`:

- `ESCALA = 4` — escala padrão (16px → 64px), sobrescrita por `ESCALAS`.
- `PADRAO_QUADROS = 2` — nº de quadros padrão, sobrescrito por `QUADROS`.
- `VELOCIDADE_ANIM = 0.06` — velocidade de troca de quadro do `AnimatedSprite`.

## Ideias futuras

### Estados de animação (parado de frente, andando, etc.)

Hoje cada personagem tem **uma** animação (caminhada), e o avatar só espelha ela
pra andar nos dois sentidos. O próximo passo natural é ter **várias animações por
personagem** — por exemplo `andar` e `parado` (com o personagem de frente) — e
trocar conforme o estado do avatar.

Esboço de como ficaria (não implementado ainda):

```
assets/characters/link-minish-cap/
├─ andar/     1.png … 10.png   (lateral, olhando pra esquerda)
└─ parado/    1.png … 4.png    (de frente, respirando/piscando)
```

- `characters.js` carregaria um conjunto de texturas por **animação**, não só uma
  lista.
- O sprite ganharia algo como `sprite.tocar('parado')` / `sprite.tocar('andar')`
  (troca `sprite.textures` e dá `play()`).
- No `avatar.js`, quando o avatar entra em **destaque/pausa** (já existe
  `pausar()`), em vez de só congelar o quadro, tocaria a animação `parado` de
  frente; ao voltar a andar, tocaria `andar` de novo.
- A convenção `OLHANDO` passaria a valer **por animação** (a `parado` seria
  `'frente'`, a `andar` `'esquerda'`).

Isso é uma mudança de estrutura (do "lista de quadros" para "mapa de animações").
Dá pra fazer sem quebrar os personagens de 1 animação — quem só tem caminhada
continua funcionando. Quando você tiver as folhas de "parado de frente", me chama
que eu implemento.
