# Como adicionar mais sprites (personagens)

Cada espectador da live recebe um personagem fixo (sorteado por hash do nome),
então quanto mais personagens no roster, mais variedade na tela.

Há dois jeitos de adicionar: pelo **Painel** (recomendado) ou **editando os
arquivos** direto. Os dois usam o mesmo modelo de dados.

## Jeito recomendado: aba **Sprites** do Painel

Abra `http://localhost:8737/admin` → aba **Sprites**:

- **Enviar** os PNGs de um personagem (os quadros da caminhada), definindo o
  **id**, o **nº de quadros**, a **direção da arte** e a **escala**.
- **Ocultar/remover** qualquer personagem (inclusive os padrão).
- **Ajustar a escala** de um sprite específico — aplica ao vivo.

Sprites enviados pelo Painel são **locais** (ficam em `characters.local.json` e
`assets/characters-local/`, ambos **não versionados**) — ou seja, não vão pro
repositório. Para fixar um sprite a um @ ou marcar VIP, use a aba **Usuários**.

## Modelo de dados

O roster padrão (versionado) fica em
[`src/overlay/characters.json`](../src/overlay/characters.json):

```json
{
  "characters": [
    { "id": "hero" },
    { "id": "ninja", "frames": 4, "scale": 3, "facing": "left" }
  ],
  "overrides": {}
}
```

Cada entrada tem um `id` (obrigatório) e três campos opcionais, com estes
padrões (`DEFAULTS` em `characters.js`):

| Campo    | Padrão    | O que faz                                                        |
| -------- | --------- | ---------------------------------------------------------------- |
| `frames` | `2`       | Quantos quadros a animação de caminhada tem (`1.png`…`N.png`).   |
| `scale`  | `2`       | Escala **por sprite** (multiplica a escala global e a responsiva).|
| `facing` | `"front"` | Direção pra qual a arte foi desenhada (`front`, `left`, `right`). |

O `id` precisa bater **exatamente** com o nome da pasta dos PNGs.

## Arquivos de imagem

- Uma **pasta por personagem** com os quadros numerados:
  `src/overlay/assets/characters/<id>/1.png`, `2.png`, … `N.png`
  (numerados de 1 até `frames`, sem buracos).
- **PNG com transparência**, pixel art nítido (o overlay usa
  `scaleMode: 'nearest'` pra não borrar).
- **Pés na base do quadro**: a âncora do sprite é o centro-inferior
  (`anchor.set(0.5, 1)`), então todo personagem "pisa" na mesma linha do chão,
  independente da altura do desenho.
- Todos os quadros do mesmo personagem com o **mesmo tamanho**.

O tamanho não precisa ser 16×16 (é só o tamanho dos assets atuais). Para um
personagem de PNG maior/menor não ficar fora de proporção, ajuste o `scale` da
entrada dele.

## Escala (como o tamanho final é calculado)

O tamanho na tela é `scale` (por sprite) × **escala global dos avatares** (no
Painel) × **escala responsiva** (proporcional à altura do canvas) —
ver `effectiveScale` em [`scale.js`](../src/overlay/scale.js). Assim o mesmo
overlay serve 1080×1920 (vertical) e 1920×1080 (horizontal) mantendo a proporção.

## Direção da arte (espelhamento)

O avatar anda pros dois lados. Se a arte é lateral, o código **espelha** o sprite
(`scale.x` negativo) na direção do movimento — você só diz pra que lado a arte
foi desenhada:

| `facing`  | Quando usar                                              |
| --------- | ------------------------------------------------------- |
| `"front"` | **Padrão.** Arte de frente/simétrica (não espelha).     |
| `"left"`  | Arte lateral desenhada olhando pra **esquerda**.        |
| `"right"` | Arte lateral desenhada olhando pra **direita**.         |

## Passo a passo (edição manual)

1. Crie `src/overlay/assets/characters/<id>/1.png` … `N.png`.
2. Adicione `{ "id": "<id>" }` ao array `characters` em `characters.json`
   (com `frames`/`scale`/`facing` se fugir dos padrões).
3. Recarregue a fonte do overlay no OBS (ou a página) — não há build; os PNGs
   são servidos estaticamente e o PixiJS vem por CDN.
4. (Opcional) `npm test` — o teste em
   [`tests/characters.test.js`](../tests/characters.test.js) garante que o
   sorteio sempre devolve um id do roster; ele se adapta sozinho ao novo tamanho.

## Erros comuns

| Sintoma                                    | Causa provável                                                         |
| ------------------------------------------ | --------------------------------------------------------------------- |
| Personagem some / aparece como caixa vazia | `id` não bate com a pasta, ou falta algum quadro `1..N.png`.          |
| Erro 404 de um PNG ao carregar             | `frames` maior que a quantidade real de arquivos, ou numeração com buraco. |
| Sprite borrado                             | Arte em alta-res com `scaleMode: 'nearest'` (troque pra `'linear'`) ou não é pixel art nítido. |
| Personagem "flutuando" ou afundado         | Desenho sem os pés na base do quadro.                                 |
| Gigante ou minúsculo perto dos outros      | PNG de tamanho diferente sem ajustar o `scale` da entrada.            |
| Anda "de costas" pra um lado               | Arte lateral com `facing` errado (use `"left"`/`"right"`).            |
