# VRUI

VRUI is a TypeScript library for building browser interfaces from real DOM elements and signals. You style elements with utility class names, and VRUI writes the CSS for the classes you use while the page runs. You don't need a stylesheet, a CSS build step, or a virtual DOM.

## Why use VRUI

Every element factory, such as `div` or `button`, returns a real `HTMLElement`. You can hand it to any library that takes a DOM node. When a signal changes, VRUI updates the text or attribute that reads it and leaves the rest of the page alone.

The class names follow Tailwind, but spacing, type size, radius, shadow and color come from fixed scales. A class like `w-[13px]` throws an error, so one-off values can't creep in. Colors go through roles such as `accent` and `danger`, and the theme decides which palette each role uses.

VRUI ties listeners, timers and observers to the part of the page that started them. When that part is removed, VRUI stops them too.

The library is 3,700 lines of TypeScript and 12.6 KB minified and gzipped. Its only dependency is Lucide, for icons.

## Catch mistakes before they ship

VRUI includes `vrui-check`, which reads your source and reports three kinds of problems:

- class names VRUI doesn't generate, which otherwise do nothing and show no error
- timers and event listeners in view code that VRUI can't clean up
- the same class list repeated in several places, which should become a component

Run it with your other checks. It helps most when an AI agent writes your UI, because the agent can read the report and fix each problem itself.

## Get started

Install VRUI and Lucide from GitHub with `bun add github:vaakx-dev/vrui lucide`. npm works too, and builds the package during install. Bun uses the TypeScript source directly.

Read [Application structure](docs/application-patterns.md) first. It shows how to lay out a small app and when to split it up. The `examples` folder has two complete apps: a task list and a multi-page workshop manager.

## Versions

VRUI is in alpha, and the API can change between releases. Each GitHub release, such as `v0.1.0-alpha.1`, never changes. The `nightly` tag points to the newest commit on `main` that passed the checks, and moves at most once a day. `main` has every change as soon as it's pushed.

## Docs

- [Application structure](docs/application-patterns.md)
- [DOM factories](docs/domFactories.md)
- [Runtime utilities](docs/utilities.md)
- [Events](docs/events.md)
- [Reactivity](docs/reactivity.md)
- [Flow helpers](docs/flow.md)
- [Forms](docs/forms.md)
- [Lifecycle and cleanup](docs/lifecycle.md)
- [Canvas](docs/canvas.md)
- [Icons](docs/icons.md)
- [Store and resources](docs/storeResource.md)
- [Portal](docs/portal.md)
- [SVG](docs/svg.md)
- [Working on VRUI](docs/development.md)
