import {
  div,
  h2,
  p,
  section,
  type Child,
  type ClassValue,
} from "@vaakx-dev/vrui";

export type PanelOptions = {
  action?: Child;
  class?: ClassValue;
  description?: Child;
  title: Child;
};

export function panel(
  options: PanelOptions,
  ...children: Child[]
): HTMLElement {
  return section(
    {
      class: [
        "box-border flex flex-col gap-5 rounded-xl border border-solid",
        "border-neutral-200 bg-white p-5 shadow-xs",
        options.class,
      ],
    },
    div(
      { class: "flex flex-wrap items-start justify-between gap-4" },
      div(
        h2({ class: "text-lg font-semibold text-neutral-900" }, options.title),
        options.description && p(
          { class: "mt-1 text-sm text-neutral-500" },
          options.description,
        ),
      ),
      options.action,
    ),
    ...children,
  );
}
