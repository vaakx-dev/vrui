import {
  button,
  type Child,
  type Props,
} from "@vaakx-dev/vrui";

type ActionProps = Props<HTMLButtonElement>;

function action(
  appearance: string,
  props: ActionProps,
  children: Child[],
): HTMLButtonElement {
  const { class: class_name, ...button_props } = props;

  return button(
    {
      ...button_props,
      class: [
        "inline-flex items-center justify-center gap-2 whitespace-nowrap",
        "rounded-lg border border-solid px-4 py-2 font-sans text-sm font-semibold",
        "outline-none cursor-pointer transition-colors focus-visible:ring-2",
        "focus-visible:ring-accent-200 disabled:pointer-events-none disabled:opacity-50",
        appearance,
        class_name,
      ],
    },
    ...children,
  );
}

export function primary_action(
  props: ActionProps,
  ...children: Child[]
): HTMLButtonElement {
  return action(
    "border-accent-600 bg-accent-600 text-white hover:bg-accent-700",
    props,
    children,
  );
}

export function secondary_action(
  props: ActionProps,
  ...children: Child[]
): HTMLButtonElement {
  return action(
    "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50",
    props,
    children,
  );
}

export function quiet_action(
  props: ActionProps,
  ...children: Child[]
): HTMLButtonElement {
  return action(
    "border-transparent bg-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
    props,
    children,
  );
}

export function danger_action(
  props: ActionProps,
  ...children: Child[]
): HTMLButtonElement {
  return action(
    "border-danger-200 bg-danger-50 text-danger-700 hover:bg-danger-100",
    props,
    children,
  );
}
