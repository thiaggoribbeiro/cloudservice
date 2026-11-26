# Design System — Aptus

Referência visual do **Aptus — Gestão de Licenças da Avesta**: cores, tipografia, espaçamento, forma,
elevação, movimento e componentes. Tudo aqui foi extraído do código; a fonte da verdade é
[`src/index.css`](../src/index.css) (bloco `@theme` do Tailwind v4) e [`src/components/ui.tsx`](../src/components/ui.tsx).

> Ao mudar um token, mude primeiro em `src/index.css` e depois atualize este arquivo.

---

## 1. Princípios

1. **Neutro frio, laranja só como acento.** A base é uma escala *slate* (azul-acinzentada). O laranja
   Avesta aparece em ação primária, item ativo, foco e números de destaque, nunca como fundo de área grande.
2. **Cor de status é informação, não decoração.** Verde, âmbar, azul, aço e cinza têm significado fixo
   (seção 2.3). Não reutilize essas cores para enfeite.
3. **Mesmo nome de token nos dois temas.** O tema escuro redefine os mesmos tokens; o componente nunca
   precisa saber qual tema está ativo.
4. **Densidade de painel administrativo.** Corpo em 14 px, rótulos em 12 px, números com `tabular-nums`.
5. **Movimento só para orientar.** Uma entrada orquestrada no Painel e transições curtas em resposta à
   ação do usuário. `prefers-reduced-motion` desliga tudo.
6. **Acessível por padrão.** Foco visível em todo elemento interativo, status nunca só por cor
   (sempre com texto ou ícone), paletas validadas para daltonismo.

---

## 2. Cores

Os tokens têm o prefixo histórico `light-`, mas valem para os dois temas. Use-os como classes
Tailwind: `bg-light-primary`, `text-light-on-surface`, `border-light-outline-variant` etc.

O tema é aplicado por `<html data-theme="light|dark">` — definido antes da primeira pintura por um
script em [`index.html`](../index.html) e alterado por [`src/lib/theme.ts`](../src/lib/theme.ts)
(preferências `claro`, `escuro`, `sistema`; chave `avesta-tema` no `localStorage`).

### 2.1 Marca

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `primary` | `#A33D00` | `#F2894F` | Botão primário, links, foco, números de destaque, avatar |
| `on-primary` | `#FFFFFF` | `#1C0A01` | Texto sobre `primary` |
| `primary-container` | `#C4541B` | `#FFA472` | Hover do botão primário |
| `on-primary-container` | `#FFFFFF` | `#1C0A01` | Texto sobre `primary-container` |
| `secondary` | `#954925` | `#F2A27A` | Acento secundário |
| `secondary-container` | `#FDEEE6` | `#3A2316` | **Item de menu ativo**, item selecionado, chip de filtro |
| `on-secondary-container` | `#A33D00` | `#FFB68C` | Texto/ícone do item ativo |
| `tertiary` | `#884F35` | — | Reserva (pouco usado) |
| `tertiary-container` | `#A5674B` | — | Reserva |
| `inverse-primary` | `#FFB597` | `#A33D00` | Ícone dentro do toast |

Laranja da logo (SVG da splash): `#C1531C`. Cinzas da logo: `#6C6C6C`, `#8D8D8D`, `#ABABAB`.

### 2.2 Neutros e superfícies

Claro = escala **slate** fria. Escuro = **grafite** neutro.

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `background` | `#F8FAFC` | `#0E0E0F` | Fundo da página |
| `on-background` | `#0F172A` | `#E7E7EA` | Texto sobre o fundo |
| `surface` | `#F8FAFC` | `#141416` | Inputs (no escuro, levemente afundado sob o card) |
| `surface-dim` | `#E2E8F0` | `#0E0E0F` | — |
| `surface-bright` | `#F8FAFC` | `#2A2A2E` | — |
| `surface-container-lowest` | `#FFFFFF` | `#1B1B1D` | **Cards**, sidebar, header, drawers, menus |
| `surface-container-low` | `#F1F5F9` | `#222225` | Hover de linha, cabeçalho de tabela, KPI interno |
| `surface-container` | `#EDF1F6` | `#28282C` | Hover de item de menu, fundo de iniciais |
| `surface-container-high` | `#E2E8F0` | `#313136` | Trilho de barras e anéis de progresso, trilho do toggle |
| `surface-container-highest` | `#DCE3EC` | `#3A3A40` | Contador (badge) do menu |
| `on-surface` | `#0F172A` | `#E7E7EA` | Texto principal |
| `surface-variant` | `#F1F5F9` | `#28282C` | — |
| `on-surface-variant` | `#475569` | `#A1A1AA` | Texto secundário, subtítulos, cabeçalho de tabela |
| `outline` | `#94A3B8` | `#6E6E78` | Ícone de busca, ícone de estado vazio, borda em hover |
| `outline-variant` | `#E2E8F0` | `#2F2F34` | **Borda padrão** de cards, inputs, divisores |
| `inverse-surface` | `#1E293B` | `#E7E7EA` | Fundo do toast |
| `inverse-on-surface` | `#F1F5F9` | `#18181B` | Texto do toast |
| `scrim` | `#0F172A` | `#000000` | Fundo atrás de drawer/modal (usar `bg-scrim/55`) |

**Hierarquia de superfícies:** página (`background`) → card (`surface-container-lowest`) → bloco interno
(`surface-container-low`) → trilho/realce (`surface-container-high`).

### 2.3 Status de licença

Cada status tem quatro tokens: cor cheia (barras, ícones, números), texto sobre ela, fundo de badge
(`-container`) e texto do badge (`on-…-container`). Classes: `bg-status-vigente`,
`bg-status-vigente-container`, `text-on-status-vigente-container` etc.

| Status | Significado | Cheia (claro / escuro) | Container (claro / escuro) | Texto do badge (claro / escuro) | Ícone |
|---|---|---|---|---|---|
| `vigente` | Licença válida | `#15803D` / `#2FAE5F` | `#DCFCE7` / `#123222` | `#14532D` / `#86EFAC` | `check_circle` |
| `avencer` | Vence em breve | `#B45309` / `#FBBF24` | `#FEF3C7` / `#3A2A0C` | `#78350F` / `#FCD34D` | `schedule` |
| `tramite` | Em trâmite | `#1D4ED8` / `#60A5FA` | `#DBEAFE` / `#172A4F` | `#1E3A8A` / `#BFDBFE` | — |
| `pendente` | Pendente | `#2E6BAE` / `#5F95D2` | `#E2ECF7` / `#17283D` | `#1D4A7A` / `#BCD5F2` | `pending_actions` |
| `na` | Operação fechada / não se aplica | `#8A94A3` / `#5E5E66` | `#E2E8F0` / `#313136` | `#1E293B` / `#D4D4D8` | `block` |
| `error` (*Vencida*) | Data vencida | `#BA1A1A` / `#F87171` | `#FFDAD6` / `#4A1C1C` | `#93000A` / `#FECACA` | `error` |

Decisões que não devem ser desfeitas:

- **Pendente é azul-aço**, da mesma família fria dos neutros e complementar ao laranja. Fica longe do
  âmbar/vermelho dos alertas e do verde de *vigente*, inclusive para daltonismo vermelho-verde.
- **N/A é um cinza mais claro** que o aço, para não ser confundido com *pendente* lado a lado.
- O mapeamento em código está em [`StatusBadge.tsx`](../src/components/StatusBadge.tsx)
  (`STATUS_STYLES` e `ALERT_STYLES`). Use esses objetos em vez de montar classes à mão.

### 2.4 Mapa de calor (Brasil)

Escala divergente de 5 classes "vigência × pendência": vermelho (mais pendências) ← neutro → verde-azulado
(mais vigentes). O verde puxa para o teal e o vermelho para o quente, para separar os lados para quem tem
deuteranopia. Variáveis CSS puras (fora do `@theme`):

| Classe | Claro | Escuro | Tinta do rótulo (claro / escuro) |
|---|---|---|---|
| `--heat-1` | `#B42318` | `#F47C6A` | `#FFFFFF` / `#1B1B1D` |
| `--heat-2` | `#F4A582` | `#73361F` | `#1F1F23` / `#F8E5E5` |
| `--heat-3` | `#E2E2E6` | `#3A3A40` | `#1F1F23` / `#E7E7EA` |
| `--heat-4` | `#80CDC1` | `#2B7A6C` | `#1F1F23` / `#FFFFFF` |
| `--heat-5` | `#01665E` | `#6EDBC0` | `#FFFFFF` / `#0B1F1A` |

---

## 3. Tipografia

### 3.1 Famílias

| Token | Família | Papel |
|---|---|---|
| `font-brand` | **Ample** Bold (local, `public/fonts/Ample-Bold.otf`) | Somente o nome "Aptus" |
| `font-display` / `font-headline` | **Red Hat Text** 600/700 | Títulos de página, de card, números grandes |
| `font-title` / `font-body` / `font-label` | **Lato** 400/600/700 | Texto corrido, rótulos, botões, menu |
| `font-mono` | **Source Code Pro** 500 | Datas, protocolos, números de documento em tabela |

Red Hat Text, Lato e Source Code Pro vêm do Google Fonts (ver `index.html`).

> **Licença:** a Ample é "Free for Personal Use" (exfont.com). Compre a licença comercial antes de ir
> para produção, ou troque o arquivo.

### 3.2 Escala

Cada `text-*` já carrega tamanho, entrelinha, espaçamento e peso. Combine com a família correspondente
(`font-headline text-headline-sm`, `font-body text-body-md`, `font-label text-label-md`).

| Token | Tamanho / entrelinha | Tracking | Peso | Família | Onde aparece |
|---|---|---|---|---|---|
| `display-lg` | 36 / 44 | −0,5 px | 700 | Red Hat Text | Índice de conformidade (número herói) |
| `headline-lg` | 28 / 34 | −0,25 px | 700 | Red Hat Text | Valores dos KPIs |
| `headline-md` | 22 / 28 | −0,15 px | 600 | Red Hat Text | Título de página |
| `headline-sm` | 18 / 24 | 0 | 600 | Red Hat Text | Título de card, título de drawer |
| `title-md` | 16 / 22 | 0 | 700 | Lato | Subtítulo de seção, título de estado vazio |
| `body-lg` | 15 / 22 | 0 | 400 | Lato | Texto de destaque |
| `body-md` | 14 / 20 | 0 | 400 | Lato | **Texto padrão**, inputs, células |
| `body-sm` | 13 / 18 | 0 | 400 | Lato | Legendas, dicas, subtítulos, erros de campo |
| `label-lg` | 14 / 20 | 0,1 px | 700 | Lato | Itens do menu lateral |
| `label-md` | 12 / 16 | 0,2 px | 700 | Lato | Botões, rótulos de campo, cabeçalho de tabela |
| `label-sm` | 12 / 16 | 0,3 px | 600 | Lato | Badges, contadores, legendas de gráfico |
| `mono-md` | 13 / 18 | 0 | 500 | Source Code Pro | Datas e códigos em tabela |

Regras:

- Números que se comparam (KPIs, contadores, colunas) usam **`tabular-nums`**.
- Rótulos em **sentence case**, sem caixa-alta.
- Logo na sidebar: `font-brand text-[24px] leading-none tracking-[-0.01em]`.

---

## 4. Espaçamento e layout

### 4.1 Tokens de espaço

| Token | Valor | Uso típico |
|---|---|---|
| `gutter-xs` | 4 px | Ícone + texto, chips agrupados, itens do menu |
| `gutter-sm` | 8 px | Gaps internos de linha e de header |
| `gutter-md` | 16 px | Gap entre cards, entre campos do formulário |
| `gutter-lg` | 24 px | Entre blocos do Painel, blocos da sidebar |
| `gutter-xl` | 32 px | Respiro grande |
| `section` | 40 px | Entre seções |
| `page-margin` | 24 px | Margem de página |

Uso: `gap-gutter-md`, `p-gutter-lg`, `px-page-margin`. Paddings de componente usam a escala Tailwind
padrão (`p-4`, `p-5`, `p-6`, `px-3 py-2`).

### 4.2 Estrutura da aplicação

```text
┌──────────────┬──────────────────────────────────────────────┐
│  Sidebar     │  Header (título + subtítulo da página,       │
│  logo Aptus  │  busca global, toggle de tema, conta)        │
│  navegação   ├──────────────────────────────────────────────┤
│  contadores  │  main  · p-4 sm:p-6 · max-w-[1440px] mx-auto │
│  Config.     │  ┌────────── grid 12 colunas (lg) ─────────┐ │
│              │  │ card 4 col   │ KPIs 8 col (2→3 col)     │ │
│              │  ├──────────────┴──────────────────────────┤ │
│              │  │ card 6 col          │ card 6 col        │ │
└──────────────┴──┴─────────────────────┴───────────────────┴─┘
```

- **Sidebar** fixa a partir de `lg`; abaixo vira menu off-canvas com botão de fechar.
- **Grid:** `grid-cols-1 lg:grid-cols-12 gap-gutter-md`; grupos de KPI em `grid-cols-2 sm:grid-cols-3`.
- **Breakpoints** (Tailwind padrão): `sm` 640, `md` 768, `lg` 1024, `xl` 1280.
- Conteúdo alinhado à esquerda; só estados vazios e a tela de login são centralizados.

---

## 5. Forma e elevação

### 5.1 Raios

O raio cresce com o tamanho e a importância da superfície:

| Classe | Valor | Onde |
|---|---|---|
| `rounded` | 4 px | Barras de gráfico (`rounded-t`), alvo de foco em links |
| `rounded-lg` | 8 px | **Botões, inputs**, itens do menu, logos de marca |
| `rounded-xl` | 12 px | Menus suspensos, toast, listas com borda, tiles de ícone 36 px |
| `rounded-2xl` | 16 px | **Cards** e painéis principais, login |
| `rounded-full` | — | Badges, contadores, avatares, toggle, barras de progresso |

### 5.2 Sombras

Elevação discreta; a borda `outline-variant` faz a maior parte da separação.

| Classe | Onde |
|---|---|
| `shadow-sm` | Cards em repouso, knob do toggle |
| `shadow-md` | Card clicável em hover (com `hover:-translate-y-0.5` nos KPIs) |
| `shadow-lg` | Toast |
| `shadow-xl` | Menus suspensos, resultados da busca, tooltip do mapa |
| `shadow-2xl` | Drawer lateral |

---

## 6. Movimento

### 6.1 Durações e curvas

| Token | Valor | Uso |
|---|---|---|
| `duration-state-change` + `ease-state-change` | 120 ms, `ease-out` | Hover, cor, seleção |
| `duration-surface-enter` + `ease-surface-enter` | 220 ms, `cubic-bezier(0.2, 0, 0, 1)` | Drawer, menus abrindo |
| `duration-surface-exit` + `ease-surface-exit` | 150 ms, `cubic-bezier(0.3, 0, 1, 1)` | Superfícies fechando |
| troca de tema | 200 ms, `ease-out` | Classe `.theme-transition` no `<html>` por 250 ms |

### 6.2 Animações de entrada (Painel)

Todas com `fill-mode: backwards`: seguram o estado inicial durante o atraso e depois liberam, para não
travar transforms de hover.

| Classe | Duração | Efeito |
|---|---|---|
| `animate-rise` | 560 ms | Card sobe 14 px e cresce de 0,98 |
| `animate-reveal-x` | 1000 ms | Barra empilhada revela da esquerda (`clip-path`) |
| `animate-grow-y` | 760 ms | Barras verticais crescem da base |
| `animate-grow-x` | 1100 ms | Barras horizontais crescem da esquerda |
| `animate-ring` | 1400 ms | Anel de progresso se preenche |
| `animate-pop` | 480 ms | Ícone entra com escala e rotação (curva com overshoot) |
| `animate-fade` | 420 ms | Fade simples |
| `drawer-in` | 140–220 ms | Desliza 32 px da direita (drawer, menus, tooltip) |

A abertura animada (splash) está documentada em [`splash-animado.md`](splash-animado.md).

`prefers-reduced-motion: reduce` zera durações e atrasos de todas as animações e transições.

---

## 7. Iconografia

- **Material Symbols Outlined** (fonte variável do Google). Use a classe própria **`.ms-icon`**, não
  `.material-symbols-outlined`: a regra do Google força 24 px e vence os utilitários do Tailwind.
- Tamanhos: `text-[14px]` em badges, `text-[18px]` em botões e busca, `text-[20px]` no menu e títulos de
  seção, `text-[28px]`–`text-[36px]` em destaque e estado vazio.
- Estado ativo usa o ícone preenchido: `.material-symbols-filled`.
- Ícones decorativos sempre com `aria-hidden="true"`.

```html
<span class="ms-icon text-[20px] text-light-primary" aria-hidden="true">folder_open</span>
```

Ícones do menu: `dashboard`, `folder_open`, `sell`, `storefront`, `supervisor_account`,
`account_balance`, `settings`.

---

## 8. Componentes

As constantes abaixo estão em [`src/components/ui.tsx`](../src/components/ui.tsx). Importe-as em vez de
copiar as classes.

### Botão primário — `BTN_PRIMARY`

```text
inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg
bg-light-primary text-light-on-primary font-label text-label-md
hover:bg-light-primary-container disabled:opacity-60
focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-light-primary
```

### Botão secundário — `BTN_SECONDARY`

```text
inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg
border border-light-outline-variant bg-light-surface-container-lowest
text-light-on-surface font-label text-label-md hover:bg-light-surface-container-low
```

### Ação destrutiva — `DeleteButton`

Em repouso é texto vermelho (`text-light-error hover:bg-light-error-container/50`) com ícone `delete`.
O clique abre uma confirmação inline: **Confirmar exclusão** (`bg-light-error text-light-on-error`) +
**Cancelar**.

### Botão de ícone

`w-9 h-9 rounded-lg inline-flex items-center justify-center text-light-on-surface-variant hover:bg-light-surface-container`
— sempre com `aria-label`.

### Input — `INPUT_CLASS`

```text
w-full px-3 py-2 rounded-lg border border-light-outline-variant bg-light-surface
text-light-on-surface font-body text-body-md
focus:border-light-primary focus:ring-1 focus:ring-light-primary disabled:opacity-70
```

Campo com rótulo: `Field` (rótulo `label-md`, dica `body-sm on-surface-variant`, erro `body-sm text-light-error`).
Busca: `SearchInput` (ícone `search` em `text-light-outline` à esquerda, `pl-9`).

### Card — `CARD_CLASS`

```text
bg-light-surface-container-lowest border border-light-outline-variant rounded-2xl shadow-sm
```

Padding `p-5` (painéis) ou `p-4` (KPIs). Card clicável acrescenta
`hover:shadow-md hover:border-light-primary transition-all duration-state-change cursor-pointer`.

### Badge de status

```text
inline-flex items-center px-2.5 py-1 rounded-full whitespace-nowrap font-label text-label-sm
+ bg-status-{x}-container text-on-status-{x}-container
```

`AlertBadge` acrescenta ícone de 14 px (`schedule` / `error`).

### Item de navegação

- Base: `px-3 py-2.5 rounded-lg font-label text-label-lg`, ícone de 20 px.
- Repouso: `text-light-on-surface-variant hover:bg-light-surface-container hover:text-light-on-surface`.
- Ativo: `bg-light-secondary-container text-light-on-secondary-container` + ícone preenchido + `aria-current="page"`.
- Contador: `px-2 py-0.5 rounded-full bg-light-surface-container-highest text-label-sm tabular-nums`.

### Tabela

- `thead`: `bg-light-surface-container-low border-b border-light-outline-variant`.
- `th`: `px-4 py-3 text-light-on-surface-variant font-label text-label-md whitespace-nowrap`, com `aria-sort`.
- `td`: `px-4 py-3`; linha com `hover:bg-light-surface-container-low`.
- Datas em `font-mono text-mono-md tabular-nums`, coloridas: vencida `text-light-error`, a vencer
  `text-status-avencer`, sem data `text-light-on-surface-variant`.

### Drawer — `Drawer`

Painel à direita (`max-w-lg`, ou `max-w-3xl` com `wide`), `bg-light-surface-container-lowest border-l shadow-2xl`.
Fundo `bg-scrim/55 backdrop-blur-[1px]`. Header e footer `px-6 py-4` com divisor; corpo `p-6 gap-gutter-md`.
Fecha com Esc e clique no fundo.

### Menu suspenso / resultados de busca

`rounded-xl border border-light-outline-variant bg-light-surface-container-lowest shadow-xl`, entrada
`drawer-in 160ms`.

### Toast

`fixed bottom-5 right-5 px-4 py-3 rounded-xl bg-light-inverse-surface text-light-inverse-on-surface shadow-lg`,
ícone em `text-light-inverse-primary`.

### Toggle de tema

Trilho `w-10 h-[22px] rounded-full bg-light-surface-container-high border`; ícones fixos
`light_mode`/`dark_mode` de 12 px nas pontas; knob de 16 px desliza 18 px em 220 ms. `role="switch"`.

### Estado vazio

Card `p-10 text-center` com ícone de 36 px em `text-light-outline`, título `title-md`, explicação
`body-sm on-surface-variant` dizendo o que fazer, e um botão de ação.

### Logo / avatar — `LogoImage`

Logos de marca: `rounded-lg object-contain bg-white border p-0.5`. Fotos de pessoa: `rounded-full object-cover`.
Sem imagem: iniciais em `bg-light-surface-container text-light-primary`.

### Gráficos

- Barras e anéis em `rounded-full` sobre trilho `bg-light-surface-container-high`, preenchidos com as
  cores de status (`STATUS_STYLES[status].barBg`).
- Legenda: ponto `w-2.5 h-2.5 rounded-full` + rótulo `label-sm`.
- Segmentos clicáveis levam ao filtro correspondente e têm foco visível.

---

## 9. Acessibilidade

- **Foco:** `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-light-primary`
  em todo controle. No mapa, `stroke: var(--color-light-primary); stroke-width: 3`.
- **Status nunca só por cor:** badge sempre com texto; alertas com ícone.
- **Contraste:** as cores de status do tema escuro foram validadas sobre `#1B1B1D` (faixa de
  luminosidade e separação para visão normal e daltônica). Ao criar uma cor nova, valide contra o fundo de card.
- **Movimento reduzido** respeitado globalmente.
- **Diálogos:** `role="dialog" aria-modal="true" aria-labelledby`, fecham com Esc.

---

## 10. Faça / Não faça

| Faça | Não faça |
|---|---|
| Usar tokens (`bg-light-primary`) | Colar hex no componente |
| `rounded-2xl` em card, `rounded-lg` em controle | Um único raio para tudo |
| Laranja em ação primária, seleção e foco | Laranja como fundo de seção ou card |
| Cor de status só para status | Verde/vermelho para enfeite ou marca |
| `tabular-nums` em números comparáveis | Números com largura variável em colunas |
| Importar `BTN_*`, `INPUT_CLASS`, `CARD_CLASS`, `STATUS_STYLES` | Recriar as classes à mão |
| Testar nos dois temas | Assumir fundo branco (`bg-white` só atrás de logo) |
| Escrever rótulos em sentence case | Rótulos em caixa-alta |
