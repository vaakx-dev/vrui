import { div, p } from "@vaakx-dev/vrui";

export function empty_state(
  title: string,
  description: string,
): HTMLDivElement {
  return div(
    {
      class: [
        "rounded-xl border border-solid border-neutral-200 bg-neutral-50",
        "p-8 text-center",
      ],
    },
    p({ class: "font-semibold text-neutral-800" }, title),
    p({ class: "mt-2 text-sm text-neutral-500" }, description),
  );
}
