import {
  div,
  input,
  label,
  list,
  show,
  span,
} from "@vaakx-dev/vrui";
import { badge } from "../components/badge";
import { empty_state } from "../components/empty";
import { text_field } from "../components/field";
import { feature_page, page_heading } from "../components/page";
import { panel } from "../components/panel";
import type { PartsModel } from "./model";
import { part_row } from "./row";

export function parts_view(model: PartsModel): HTMLElement {
  return feature_page(
    "normal",
    page_heading(
      "Stock room",
      "Parts",
      "Parts used by current workshop jobs.",
      span(
        { class: "inline-flex items-center gap-2" },
        badge("Reorder", "warning"),
        span({ class: "text-sm font-semibold text-neutral-600" }, model.low_count),
      ),
    ),
    panel(
      {
        description: "Receiving stock updates availability immediately.",
        title: "Inventory",
      },
      div(
        { class: "grid grid-cols-1 gap-4 md:grid-cols-2" },
        text_field("Find a part", {
          bindValue: model.query,
          placeholder: "Name, SKU, or shelf",
          type: "search",
        }),
        label(
          { class: "flex items-center gap-3 self-end rounded-lg bg-neutral-50 px-3 py-2" },
          input({
            bindChecked: model.low_only,
            class: "h-5 w-5 accent-accent-600 cursor-pointer",
            type: "checkbox",
          }),
          span({ class: "text-sm font-medium text-neutral-700" }, "Show reorder items only"),
        ),
      ),
      list(
        model.visible,
        (part) => part.id,
        (part) => part_row(model, part),
        div({ class: "flex flex-col gap-5" }),
      ),
      show(
        model.empty,
        () => empty_state(
          "No matching parts",
          "Clear the search or include parts with healthy stock.",
        ),
      ),
    ),
  );
}
