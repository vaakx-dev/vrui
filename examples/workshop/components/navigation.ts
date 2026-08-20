import { CalendarDays, ClipboardList, PackageSearch } from "lucide";
import {
  aside,
  button,
  div,
  icon,
  nav,
  p,
  span,
  type IconNode,
  type Sig,
} from "@vaakx-dev/vrui";
import type { Page } from "../model";

const pages: ReadonlyArray<{
  icon: IconNode;
  label: string;
  page: Page;
  shortcut: string;
}> = [
  { icon: ClipboardList, label: "Work orders", page: "orders", shortcut: "1" },
  { icon: CalendarDays, label: "Schedule", page: "schedule", shortcut: "2" },
  { icon: PackageSearch, label: "Parts", page: "parts", shortcut: "3" },
];

export function navigation(page: Sig<Page>): HTMLElement {
  return aside(
    {
      class: [
        "box-border flex shrink-0 flex-col gap-4 border-b border-solid",
        "border-neutral-800 bg-neutral-950 p-4 text-white",
        "lg:w-64 lg:border-r lg:border-b-0 lg:p-5",
      ],
    },
    div(
      p({ class: "text-sm font-bold" }, "Northside Cycles"),
      p({ class: "mt-1 text-xs text-neutral-400" }, "Service workshop"),
    ),
    nav(
      {
        "aria-label": "Workshop",
        class: "flex gap-2 overflow-auto lg:flex-col",
      },
      pages.map((item) => button(
        {
          "aria-pressed": page.map((current) => current === item.page),
          class: [
            "inline-flex items-center gap-3 whitespace-nowrap rounded-lg border-0",
            "bg-transparent px-3 py-2 font-sans text-sm font-medium text-neutral-300",
            "outline-none cursor-pointer transition-colors hover:bg-neutral-800",
            "hover:text-white focus-visible:ring-2 focus-visible:ring-accent-400",
            () => page.get() === item.page && "bg-neutral-800 text-white",
          ],
          onClick: page.setter(item.page),
          type: "button",
        },
        icon(item.icon, 17),
        item.label,
        span(
          { class: "ml-auto hidden text-xs text-neutral-500 lg:inline" },
          item.shortcut,
        ),
      )),
    ),
    p(
      { class: "mt-auto hidden text-xs text-neutral-500 lg:block" },
      "Alt + 1, 2, or 3 switches sections",
    ),
  );
}
