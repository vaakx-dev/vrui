# Runtime utilities

VRUI turns known class names into CSS rules when an element is created. The
application does not need a CSS file, source scan, or CSS build step.

```ts
import { button } from "@vaakx-dev/vrui";

const save = button(
  {
    class: [
      "inline-flex items-center gap-2 rounded-md px-4 py-2",
      "bg-accent-600 text-sm font-semibold text-white",
      "hover:bg-accent-700 focus-visible:ring-2",
      "disabled:pointer-events-none disabled:opacity-50",
    ],
    onClick: saveProject,
  },
  "Save",
);
```

The original class names stay on the element. VRUI inserts each generated rule
once into `style[data-vrui-utilities]` and sorts rules independently of element
creation order. Reactive class values register new rules before updating the
element.

Unknown class names remain available for external integrations. Arbitrary
utility values such as `w-[13px]` throw. Use the existing `style` prop for a
real dynamic or platform-specific value.

## Built-in scales

Spacing utilities use `0`, `1`, `2`, `3`, `4`, `5`, `6`, `8`, `10`, `12`,
`16`, `20`, and `24`. Examples include `p-4`, `px-6`, `mt-2`, `gap-4`,
`w-24`, and `h-full`.

Text sizes are `xs`, `sm`, `base`, `lg`, `xl`, `2xl`, and `3xl`. Radius
values are `none`, `sm`, `md`, `lg`, `xl`, `2xl`, and `full`. Shadows are
`xs`, `sm`, `md`, `lg`, and `xl`.

The first utility set covers:

- block, inline, flex, and grid display
- position and overflow
- flex direction, wrapping, alignment, and distribution
- grid columns
- padding, margin, gap, width, and height
- text size, weight, alignment, color, and truncation
- backgrounds, borders, radii, rings, shadows, and opacity
- pointer, cursor, appearance, and transitions

State variants include `hover`, `focus`, `focus-visible`, `active`,
`disabled`, `checked`, `first`, and `last`. Responsive variants use `sm`,
`md`, `lg`, `xl`, and `2xl`.

```ts
div({
  class: "grid grid-cols-1 gap-4 p-4 md:grid-cols-2 md:p-6",
});
```

## Color themes

Themes only assign colors. They do not change spacing, type, radius, shadow,
or breakpoints.

```ts
import { mount, themes } from "@vaakx-dev/vrui";

mount(
  "app",
  { theme: themes.indigo, mode: "dark" },
  application,
);
```

Built-in themes provide `accent`, `neutral`, `success`, `warning`, and
`danger` color roles. Available accents are `blue`, `indigo`, and `violet`.
Define another color mapping with `theme`:

```ts
import { theme } from "@vaakx-dev/vrui";

const colors = theme({
  accent: "violet",
  neutral: "gray",
  success: "green",
  warning: "amber",
  danger: "red",
});
```

Semantic color utilities use the selected role, such as `bg-accent-600` and
`text-neutral-50`. Direct palette utilities such as `bg-blue-600` work without
a theme. The `dark` variant checks the explicit mount mode.

## Named patterns

Patterns give repeated utility combinations one project-owned name.

```ts
import { patterns } from "@vaakx-dev/vrui";

export const ui = patterns({
  button: {
    primary: [
      "inline-flex items-center gap-2 rounded-md px-4 py-2",
      "bg-accent-600 text-sm font-semibold text-white",
      "hover:bg-accent-700 disabled:opacity-50",
    ].join(" "),
  },
});
```

```ts
button({ class: ui.button.primary, onClick: saveProject }, "Save");
```

Pattern definitions accept only known utilities and previously registered
patterns. `findPatterns("button")` returns the searchable catalog.

Use the audits against a rendered project surface:

```ts
const patternIssues = checkPatterns();
const viewIssues = checkUtilities(document, { strict: true });
```

`checkPatterns` reports duplicate and near-duplicate pattern definitions.
`checkUtilities` reports repeated or near-duplicate raw utility combinations.
Strict mode also reports unknown classes. The view audit covers elements that
exist under the supplied root; it is not a source-code scan.
