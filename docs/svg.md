# SVG

SVG factories mirror DOM factories but create namespaced SVG nodes and set most
props as attributes.

Available helpers include `svg`, `g`, `path`, `rect`, `circle`, `ellipse`,
`line`, `polyline`, `polygon`, `defs`, `text_el`, `title_el`, and `use_el`.

```ts
import { circle, sig, svg } from "@vaakx-dev/vrui";

const active = sig(true);

const mark = svg(
  { viewBox: "0 0 24 24", width: 24, height: 24 },
  circle({
    cx: 12,
    cy: 12,
    r: 8,
    fill: active.map((value) => (value ? "lime" : "gray")),
  }),
);
```

Use SVG factories for inline vector UI. Use `icon` when you want a Lucide icon
by name.
