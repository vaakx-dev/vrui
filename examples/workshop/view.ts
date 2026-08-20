import {
  div,
  dynamicChild,
  main,
  onDocument,
} from "@vaakx-dev/vrui";
import { navigation } from "./components/navigation";
import type { Page, WorkshopModel } from "./model";
import { orders_view } from "./orders/view";
import { parts_view } from "./parts/view";
import { schedule_view } from "./schedule/view";

export function workshop_view(model: WorkshopModel): HTMLDivElement {
  const pages: Record<Page, () => HTMLElement> = {
    orders: () => orders_view(model.orders),
    parts: () => parts_view(model.parts),
    schedule: () => schedule_view(model.schedule),
  };

  return div(
    {
      class: [
        "fixed inset-0 box-border flex flex-col overflow-hidden",
        "bg-neutral-50 font-sans text-neutral-900 lg:flex-row",
      ],
      onMount: (owner) => onDocument(owner, "keydown", (event) => {
        const key = event as KeyboardEvent;
        if (key.key === "Escape") model.orders.editor.close();
        if (!key.altKey) return;
        const page = ({ "1": "orders", "2": "schedule", "3": "parts" } as const)[key.key];
        if (page) model.page.set(page);
      }),
    },
    navigation(model.page),
    main(
      { class: "box-border flex-1 overflow-auto p-5 md:p-8" },
      dynamicChild(model.page, (page) => pages[page]()),
    ),
  );
}
