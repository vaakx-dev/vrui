# Working on VRUI

## Run the checks

Run `npm run check` before you push. It type-checks the library and the examples, runs the tests, runs `vrui-check` on the examples, builds both examples, and builds the package. CI runs the same command on every push.

## Run the examples

The repository contains two independent applications. Each has its own HTML entry point, model, view, and mount boundary. Their HTML files contain only a mount target and a module script. Every visible element is VRUI code.

- [Tasks](../examples/tasks) is a small application with one `view.ts`.
- [Workshop](../examples/workshop) is a bicycle service application. It splits work orders, scheduling, and parts into features and reuses its own components.

Start either one with `npm run example:tasks` or `npm run example:workshop`.

## Release a version

Releases are Git tags. To release the next alpha:

1. Run `npm version prerelease --preid alpha -m "chore: release %s"`. It raises the version in `package.json`, for example from `0.1.0-alpha.1` to `0.1.0-alpha.2`, commits it, and creates the tag `v0.1.0-alpha.2`.
2. Run `git push --follow-tags`.

The release workflow runs the checks on the tag and publishes a GitHub release with notes generated from the commits. If the checks fail, it publishes nothing. A version with a suffix such as `-alpha.2` is published as a pre-release.
