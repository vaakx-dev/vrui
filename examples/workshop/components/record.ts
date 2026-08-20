import { div, type Child } from "@vaakx-dev/vrui";

export function record(...children: Child[]): HTMLDivElement {
  return div(
    {
      class: [
        "flex flex-col gap-4 border-b border-solid border-neutral-100 pb-5",
        "last:border-0 last:pb-0 md:flex-row md:items-center",
      ],
    },
    ...children,
  );
}
