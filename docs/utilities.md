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

Unknown class names stay on the element for external stylesheets, but VRUI
generates nothing for them, so a misspelt or unsupported utility silently does
nothing. `vrui-check` reports them. Arbitrary utility values such as
`w-[13px]` throw. Use the existing `style` prop for a
real dynamic or platform-specific value.

## Built-in scales

Spacing and fixed-size utilities use `0`, `1`, `2`, `3`, `4`, `5`, `6`, `8`,
`10`, `12`, `16`, `20`, `24`, `32`, `40`, `48`, `64`, `80`, and `96`.
`px` is a 1px step. Examples include `p-4`, `px-6`, `mt-2`, `gap-4`, `w-64`, and
`h-full`.

Position offsets use the same scale plus `full` and `auto`: `top-*`,
`right-*`, `bottom-*`, `left-*`, `inset-*`, `inset-x-*`, and `inset-y-*`, for
example `absolute top-0 right-2` or `absolute inset-x-0 top-full`.

Named maximum widths run from `max-w-sm` through `max-w-7xl`. They provide
stable content widths without treating a page width as an arbitrary value.

Text sizes are `xs`, `sm`, `base`, `lg`, `xl`, `2xl`, and `3xl`. Radius
values are `none`, `sm`, `md`, `lg`, `xl`, `2xl`, and `full`. Shadows are
`xs`, `sm`, `md`, `lg`, and `xl`.

The first utility set covers:

- block, inline, flex, and grid display
- position, offsets, and overflow, including `overflow-x-*` and `overflow-y-*`
- flex direction, wrapping, alignment, and distribution
- grid columns
- padding, margin, gap, width, and height
- text family (`font-sans`, `font-mono`), size, weight, alignment,
  decoration, color, `tabular-nums`, and truncation
- white space (`whitespace-normal`, `-nowrap`, `-pre`, `-pre-line`,
  `-pre-wrap`, `-break-spaces`), wrapping (`break-words`, `break-all`,
  `wrap-anywhere`), and `line-clamp-1` through `line-clamp-6` or
  `line-clamp-none`
- backgrounds, borders, radii, rings, shadows, and opacity; side radii such as
  `rounded-t-lg` and `rounded-b` use `t`, `r`, `b`, and `l`
- `rotate-0`, `rotate-45`, `rotate-90`, `rotate-180`, and their negatives such
  as `-rotate-90`
- `animate-spin` and `animate-none`
- pointer, cursor, appearance, selection, `resize-*`, `overscroll-*`,
  `scrollbar-none`, accent color, and transitions

State variants include `hover`, `focus`, `focus-visible`, `focus-within`,
`active`, `disabled`, `checked`, `first`, and `last`. Responsive variants use
`sm`, `md`, `lg`, `xl`, and `2xl`.

Mark a parent with `group` and style its children by the parent's state with
`group-` and a state variant, such as `group-hover:flex` or
`group-focus-within:opacity-100`:

```ts
li(
  { class: "group flex items-center gap-2" },
  span(name),
  button({ class: "hidden group-hover:flex" }, "Remove"),
);
```

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

For a color in a style value or the application's own CSS, `colorVar(role,
shade)` returns the theme variable, such as `var(--vrui-color-neutral-900)`.
`colorValue(name, shade)` returns a palette's hex value or a registered role's
variable, and `undefined` for anything else.

## Application components

When a utility composition represents a repeated UI shape, put it in the
component that owns the element and behavior:

```ts
import { button, type Child, type Props } from "@vaakx-dev/vrui";

export function primary_action(
  props: Props<HTMLButtonElement>,
  ...children: Child[]
) {
  const { class: class_name, ...button_props } = props;

  return button(
    {
      ...button_props,
      class: [
        "inline-flex items-center gap-2 rounded-md px-4 py-2",
        "bg-accent-600 text-sm font-semibold text-white",
        "hover:bg-accent-700 disabled:opacity-50",
        class_name,
      ],
    },
    ...children,
  );
}
```

This gives the application one searchable, typed component instead of a
separate registry of class-name strings.

`vrui-check` reports arbitrary values, unknown class names, and repeated or
near-repeated utility shapes across the checked tree. It points to the first
matching source location so the shape can be extracted into the nearest
application component. It also checks strings outside `class:` that read as
class lists, such as the values of `const tones = { ok: "text-success-600" }`,
and fixed `style` entries a utility already sets, such as `top: "0"`.
