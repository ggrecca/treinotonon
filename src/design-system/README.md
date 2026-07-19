# Treino Tonon Design System

Fundação isolada da versão 2.0A.1. Ela não é importada pelo aplicativo atual e, portanto, não altera telas, regras de negócio ou o CSS legado.

## Como adotar futuramente

```jsx
import "../design-system/styles/design-system.css";
import {Button, Card} from "../design-system";

export function Example() {
  return <div className="tt-ui"><Card><Button>Salvar</Button></Card></div>;
}
```

O contêiner `.tt-ui` é obrigatório para isolar os estilos. O tema escuro é ativado no mesmo contêiner, ou em um ancestral, com `data-tt-theme="dark"`.

## Tokens

| Categoria | Tokens |
| --- | --- |
| Colors | `primary`, `secondary`, `success`, `warning`, `danger`, `info`, `background`, `surface`, `card`, `border`, `muted`, `disabled`, `overlay`, texto primário e secundário |
| Spacing | 4, 8, 12, 16, 20, 24, 32, 40, 48 e 64 px (`--tt-space-*`) |
| Radius | `sm`, `md`, `lg`, `pill` |
| Shadows | `sm`, `md`, `lg` |
| Borders | `--tt-border-width`, `--tt-border-default` |
| Opacity | `--tt-opacity-disabled`, `--tt-opacity-overlay` |
| Z-index | base, sticky, dropdown, overlay e dialog |
| Motion | duration fast/normal/slow; easing standard/emphasized; transição de cores |
| Focus | `--tt-focus-ring` |

### Tipografia

| Nível | Uso |
| --- | --- |
| Display | destaque de página ou estado excepcional |
| H1, H2, H3 | hierarquia semântica de seções |
| Title | título de card ou bloco |
| Subtitle | apoio a títulos e cabeçalhos |
| Body, Body Small | conteúdo corrido e apoio compacto |
| Caption | metadados e ajuda curta |
| Label | rótulos de campos |
| Button | ações interativas |

As definições em JavaScript estão em `tokens/tokens.js`; as variáveis CSS em `tokens/tokens.css`.

## Componentes-base

| Componente | Finalidade | Variantes e propriedades principais | Boa prática |
| --- | --- | --- | --- |
| Button | disparar ação | `variant`: primary, secondary, ghost, danger; `size`; `loading` | use texto de ação claro; `loading` bloqueia novo envio |
| Input / Textarea / Select | campos nativos | `label`, `helperText`, `error`, `required`, `disabled`, `readOnly` e atributos nativos; Input aceita adornos | preserve `name`, autocomplete, tipo, value e handlers existentes; use o controle sem label dentro de labels já existentes |
| Card | agrupar conteúdo | `elevated`, `interactive`, `as`, `className` | use `as="button"` com `interactive` para cards que navegam ou selecionam; preserve um único `onClick` |
| Badge | comunicar status | neutral, success, warning, danger | use para estado curto, não como botão |
| Chip | filtro ou seleção | `selected`, props de button | mantenha `aria-pressed` controlado |
| Dialog | confirmação ou conteúdo modal | `open`, `title`, `actions`, `onClose` | use somente quando a interrupção for necessária |
| BottomSheet | ações contextuais compactas | `open`, `title`, `onClose` | prefira em contexto mobile |
| Toast / ToastRegion | feedback transitório | `variant`, `message`, `action`, `onDismiss` | não use como confirmação de decisão crítica |
| Tabs | alternar painéis pares | `tabs`, `value`, `onChange` | mantenha os painéis acessíveis na integração futura |
| Loading | indicar trabalho em curso | `label` | use texto específico quando possível |
| Skeleton | reservar espaço de conteúdo | `width`, `height` | espelhe a forma final do conteúdo |
| EmptyState | ausência de conteúdo | `title`, `description`, `action`, `icon` | explique o próximo passo possível |

## Convenções

- Pastas: `tokens/`, `styles/` e `components/` dentro de `src/design-system/`.
- Arquivos de componentes: PascalCase (`Button.jsx`); utilitários e tokens: camelCase (`tokens.js`).
- Classes CSS: prefixo obrigatório `tt-` para não colidir com o legado.
- Exports públicos: somente por `src/design-system/index.js`; consumidores não devem importar de caminhos internos.
- Props: nomes descritivos, `variant` para aparência e `className` apenas como ponto de extensão.
- Estilos: tokens semânticos; não introduzir valores literais em componentes novos quando houver token apropriado.

## Limites desta versão

Não há adoção em telas, nem ligação com o tema atual, `Card` legado, `AppDialog` legado ou o sistema existente de toasts. Essas integrações — incluindo harmonização dos tokens legados e testes de interação de cada tela — pertencem à 2.0A.2.
