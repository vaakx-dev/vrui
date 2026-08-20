import {
  div,
  h1,
  p,
  section,
  type Child,
} from "@vaakx-dev/vrui";

export function feature_page(
  width: "normal" | "wide",
  ...children: Child[]
): HTMLElement {
  return section(
    {
      class: [
        "mx-auto flex w-full flex-col gap-6",
        width === "wide" ? "max-w-6xl" : "max-w-5xl",
      ],
    },
    ...children,
  );
}

export function page_heading(
  eyebrow: string,
  title: string,
  description: string,
  action?: Child,
): HTMLDivElement {
  return div(
    { class: "flex flex-wrap items-end justify-between gap-4" },
    div(
      p({ class: "mb-1 text-sm font-semibold text-accent-600" }, eyebrow),
      h1({ class: "text-3xl font-bold" }, title),
      p({ class: "mt-2 text-neutral-500" }, description),
    ),
    action,
  );
}
