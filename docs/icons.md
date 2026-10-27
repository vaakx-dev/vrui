# Icons

VRUI includes a small Lucide wrapper. `icon(node, size = 12, strokeWidth = 2)`
returns a `span.vrui-icon` containing the SVG. Import each icon node explicitly
from `lucide` so bundlers can exclude unused icons. VRUI re-exports Lucide's
`IconNode` type for APIs that accept icon nodes.

```ts
import { ChevronDown, Save, Settings } from "lucide";
import { button, icon } from "@vaakx-dev/vrui";

const chevron = icon(ChevronDown, 16, 1.75);
const settings = icon(Settings);
const save = icon(Save);

const controls = button({ class: "icon-button" }, chevron, settings, save);
```

The size is a number of pixels or a name that matches the text scale: `xs`
(12), `sm` (14), `md` (16), and `lg` (20). Use the names to keep icons in step
with the text beside them.

Pass an options object for a filled icon. `fill: true` fills the shape with the
text color, such as a starred item:

```ts
import { Star } from "lucide";

const starred = icon(Star, { size: "sm", fill: true });
const unstarred = icon(Star, { size: "sm", strokeWidth: 1.5 });
```

`IconOptions` holds `size`, `strokeWidth`, and `fill`; `IconSize` is a number
or one of the size names.
