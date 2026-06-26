# Forms

Use `bind_value` and `bind_checked` for common form state.

```ts
import { input, option, select, sig, textarea } from "@vaakx-dev/vrui";

const name = sig("Ada");
const enabled = sig(false);
const role = sig("admin");

input({ bind_value: name });
textarea({ bind_value: name });
input({ type: "checkbox", bind_checked: enabled });
select(
  { bind_value: role },
  option({ value: "admin" }, "Admin"),
  option({ value: "viewer" }, "Viewer"),
);
```

`bind_value` works on `input`, `textarea`, and `select`.

`bind_checked` works on `input` and stores a boolean.

For one-way input values, pass a reactive `value` prop:

```ts
import { input, sig } from "@vaakx-dev/vrui";

const value = sig("read only");
const field = input({ value });
```

For custom input handling, use `on_input` or `Sig.from_input()`.
