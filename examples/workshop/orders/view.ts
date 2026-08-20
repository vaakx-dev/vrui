import { Plus } from "lucide";
import {
  button,
  div,
  icon,
  list,
  p,
  show,
  span,
  strong,
  type Child,
} from "@vaakx-dev/vrui";
import { primary_action } from "../components/action";
import { empty_state } from "../components/empty";
import { text_field } from "../components/field";
import { feature_page, page_heading } from "../components/page";
import { panel } from "../components/panel";
import { order_editor } from "./editor";
import type { OrderFilter, OrdersModel } from "./model";
import { order_row } from "./row";

const filters: ReadonlyArray<{ label: string; value: OrderFilter }> = [
  { label: "Active", value: "active" },
  { label: "Waiting", value: "queued" },
  { label: "On bench", value: "bench" },
  { label: "Ready", value: "ready" },
];

function queue_count(label: string, value: Child, tone: string): HTMLDivElement {
  return div(
    {
      class: [
        "box-border rounded-xl border border-solid border-neutral-200",
        "bg-white p-4 shadow-xs",
      ],
    },
    p({ class: "text-xs font-semibold uppercase text-neutral-400" }, label),
    div(
      { class: "mt-2 flex items-baseline gap-2" },
      strong({ class: ["text-2xl font-bold", tone] }, value),
      span({ class: "text-xs text-neutral-400" }, "bikes"),
    ),
  );
}

export function orders_view(model: OrdersModel): HTMLElement {
  return feature_page(
    "wide",
    page_heading(
      "Service desk",
      "Work orders",
      "Track every bike from drop-off to collection.",
      primary_action(
        { onClick: model.editor.begin, type: "button" },
        icon(Plus, 16),
        "New work order",
      ),
    ),
    div(
      { class: "grid grid-cols-1 gap-3 sm:grid-cols-3" },
      queue_count("Waiting", model.queued_count, "text-neutral-700"),
      queue_count("On bench", model.bench_count, "text-accent-700"),
      queue_count("Ready", model.ready_count, "text-success-700"),
    ),
    panel(
      {
        description: "Search the current queue or focus on one stage.",
        title: "Service queue",
      },
      div(
        { class: "grid grid-cols-1 gap-4 md:grid-cols-2" },
        text_field("Find an order", {
          bindValue: model.query,
          placeholder: "Customer, bike, or service",
          type: "search",
        }),
        div(
          { class: "flex flex-wrap items-end gap-2" },
          filters.map((item) => button(
            {
              "aria-pressed": model.filter.map((value) => value === item.value),
              class: [
                "rounded-full border border-solid border-neutral-200 bg-white",
                "px-3 py-2 font-sans text-sm font-medium text-neutral-600",
                "outline-none cursor-pointer transition-colors hover:bg-neutral-100",
                "focus-visible:ring-2 focus-visible:ring-accent-200",
                () => model.filter.get() === item.value &&
                  "border-accent-200 bg-accent-50 text-accent-700",
              ],
              onClick: model.filter.setter(item.value),
              type: "button",
            },
            item.label,
          )),
        ),
      ),
      list(
        model.visible,
        (order) => order.id,
        (order) => order_row(model, order),
        div({ class: "flex flex-col gap-5" }),
      ),
      show(
        model.empty,
        () => empty_state(
          "No matching work orders",
          "Change the filter or search for another bike.",
        ),
      ),
    ),
    show(model.editor.open, () => order_editor(model.editor)),
  );
}
