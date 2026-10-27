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

The class names stay on the element. VRUI inserts each generated rule once
into `style[data-vrui-utilities]` and sorts rules independently of element
creation order. Reactive class values register new rules before updating the
element.

When two utilities in one class list set the same properties under the same
variants, the later one wins and VRUI leaves the earlier one off the element.
`["px-4 bg-accent-600", "px-2"]` renders `bg-accent-600 px-2`, and
`"hidden md:flex flex"` renders `md:flex flex`. Utilities that set only some of
the same properties, such as `p-4` and `px-2` or `text-sm` and `leading-6`,
both stay; the narrower one wins.

The style element starts with a small set of base rules:

- every element uses `border-box` sizing, no margin or padding, and a solid
  zero-width border, so `border` alone draws a line
- buttons and form fields inherit font, color, and text alignment and have no
  background
- `svg` is a block, and `[hidden]` hides an element even when a utility sets
  `display`
- a `dark` or `light` mount mode sets `color-scheme`, so native scrollbars and
  controls match
- when the user asks for reduced motion, animations and transitions finish
  at once
- touch devices show no tap highlight

Unknown class names stay on the element for external stylesheets, but VRUI
generates nothing for them, so a misspelt or unsupported utility silently does
nothing. `vrui-check` reports them. Arbitrary utility values such as
`w-[13px]` throw. Use the existing `style` prop for a
real dynamic or platform-specific value.

## Built-in scales

Spacing and fixed-size utilities use `0`, `1`, `1.5`, `2`, `3`, `4`, `5`, `6`,
`8`, `10`, `12`, `16`, `20`, `24`, `32`, `40`, `48`, `64`, `80`, and `96`.
`px` is a 1px step and `1.5` is a 6px step. Examples include `p-4`, `px-6`,
`mt-2`, `gap-1.5`, `gap-4`, `w-64`, and `h-full`.

Fractions `1/2`, `1/3`, `2/3`, `1/4`, `3/4`, and `full` work for widths,
heights, offsets, and translation, such as `w-1/3` or `max-w-1/2`.

Position offsets use the spacing scale, fractions, and `auto`: `top-*`,
`right-*`, `bottom-*`, `left-*`, `inset-*`, `inset-x-*`, and `inset-y-*`, for
example `absolute top-0 right-2` or `absolute inset-x-0 top-full`. A leading
`-` negates an offset or margin, as in `-top-1`, `-mt-1`, or `-mx-px`.

`translate-x-*` and `translate-y-*` take the spacing scale or a fraction and a
leading `-`, so `absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`
centers an element. They set the `translate` property, so they combine with
`rotate-*`, and `transition` animates both.

Opacity (`opacity-60`) and color alpha (`bg-accent-500/20`,
`text-neutral-400/60`, `ring-white/10`) use steps of 5 from 0 to 100.

`max-w-*` takes the spacing scale, fractions, `screen`, `min`, `max`, `fit`,
and the named content widths `max-w-sm` through `max-w-7xl`. The named widths
give stable page widths without an arbitrary value.

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
- line height (`leading-none`, `-tight`, `-snug`, `-normal`, `-relaxed`,
  `-loose`, and `leading-3` through `leading-10`) and letter spacing
  (`tracking-tighter` through `tracking-widest`)
- white space (`whitespace-normal`, `-nowrap`, `-pre`, `-pre-line`,
  `-pre-wrap`, `-break-spaces`), wrapping (`break-words`, `break-all`,
  `wrap-anywhere`), and `line-clamp-1` through `line-clamp-6` or
  `line-clamp-none`
- backgrounds, borders, radii, rings, shadows, and opacity; side radii such as
  `rounded-t-lg` and `rounded-b` use `t`, `r`, `b`, and `l`
- `rotate-0`, `rotate-45`, `rotate-90`, `rotate-180`, and their negatives such
  as `-rotate-90`
- `animate-spin` and `animate-none`
- entrance animations `animate-fade`, `-rise` (from below), `-pop` (from above,
  for menus), `-slide` (from the right), `-drawer` (from off-screen left), and
  `-tip` (a quick zoom, for tooltips), plus `animate-shimmer`, a light sweeping
  across text
- `antialiased` font smoothing, and `text-box-trim`, which trims the line box
  to the letters so text sits centred in a fixed-height chip;
  `text-box-trim-cap` trims to the capital height instead of the x-height, for
  capitals and initials
- `border-dashed`, `border-collapse`, `align-top`, and `flow-root`
- `touch-none`, `callout-none` (no long-press menu on iOS), and
  `scrollbars-thin`, which makes the element's scrollbar and every scrollbar
  inside it thin
- `isolate` and `isolation-auto`, which start or join a stacking context, and
  `anchor-none` and `anchor-auto`, which turn scroll anchoring off or on
- safe-area padding `pt-safe`, `pr-safe`, `pb-safe`, `pl-safe`, `px-safe`, and
  `py-safe`, which pad by the device's `env(safe-area-inset-*)`
- filters `grayscale`, `grayscale-0`, and `brightness-*` (`0`, `50`, `75`,
  `90`, `95`, `100`, `105`, `110`, `125`, `150`, `200`), which combine, so
  `grayscale brightness-75` applies both
- `ring-inset`, `backdrop-blur` (`-none`, `-xs`, `-sm`, `-md`, `-lg`, `-xl`),
  `aspect-auto`, `aspect-square`, `aspect-video`, `object-contain`, `-cover`,
  `-fill`, `-none`, `-scale-down`, and positions such as `object-top-left`
- `sr-only` and `not-sr-only`
- pointer, the common CSS cursors (`cursor-grab`, `cursor-not-allowed`,
  `cursor-col-resize`, …), appearance, selection, `resize-*`, `overscroll-*`,
  `scrollbar-none`, and accent color
- transitions: `transition`, `transition-none`, `-all`, `-colors`, `-opacity`,
  `-shadow`, `-transform`, then `duration-*` and `delay-*` (`0`, `75`, `100`,
  `150`, `200`, `300`, `500`, `700`, `1000`) and `ease-linear`, `-in`, `-out`,
  `-in-out`, `-spring`

State variants include `hover`, `focus`, `focus-visible`, `focus-within`,
`focus-visible-within` (the element or something inside it has keyboard
focus), `active`, `disabled`, `checked`, `first`, and `last`. Responsive
variants use `sm`, `md`, `lg`, `xl`, and `2xl`.

ARIA variants style an element by the state it already announces:
`aria-selected:`, `aria-expanded:`, `aria-disabled:`, and `aria-pressed:` apply
when the attribute is `"true"`, and `aria-current:` applies for any value but
`"false"`, so `aria-current="page"` matches. They work after `group-` too:

```ts
button(
  { class: "group flex items-center gap-2 aria-selected:bg-neutral-800", "aria-selected": selected },
  span({ class: "group-aria-selected:text-accent-400" }, label),
);
```

There are no `data-*` variants. A selector such as `data-[state=open]:` is an
arbitrary value; use an ARIA state or a reactive class.

`hover` and `group-hover` apply only on devices that can hover, so a tap on a
phone never leaves a hover style stuck on. `touch:` applies only on devices
that cannot hover. `motion-safe:` and `motion-reduce:` follow the user's
reduced-motion setting:

```ts
span({ class: "animate-spin motion-reduce:hidden" }, icon("loader"));
```

`placeholder:` styles a field's placeholder. `selection:` and `marker:` style
selected text and list markers of the element and everything inside it, so
`selection:bg-accent-500/40` on `document.body` covers the page. `*:` applies a
utility to each direct child, such as `*:animate-fade` on a container whose
children arrive over time. Variants after `*:` test the child, so
`*:first:rounded-t-xl` rounds only the first child.

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

The `class` mount option adds utilities to the target itself while it is
mounted. Use it for page colors and type on `document.body`, which is not a
VRUI element:

```ts
mount(document.body, {
  theme: themes.indigo,
  mode: "dark",
  class: "bg-neutral-900 text-sm text-neutral-100 antialiased",
});
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
