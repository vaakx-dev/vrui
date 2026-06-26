# Icons

VRUI includes a small Lucide wrapper. `icon(name, size = 12, stroke_width = 2)`
returns a `span.vrui-icon` containing the SVG.

Names may be Lucide PascalCase, snake case, kebab case, or spaced words.
Unknown icons render `?` and warn. Use `has_icon` to check first.

```ts
import { button, has_icon, icon } from "@vaakx-dev/vrui";

const chevron = icon("chevron_down", 16, 1.75);
const settings = icon("Settings");
const save = has_icon("save") ? icon("save") : "Save";

const controls = button({ class: "icon-button" }, chevron, settings, save);
```
