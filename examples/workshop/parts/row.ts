import { PackagePlus } from "lucide";
import {
  div,
  dynamicChild,
  icon,
  p,
  span,
  strong,
  type Sig,
} from "@vaakx-dev/vrui";
import { secondary_action } from "../components/action";
import { badge } from "../components/badge";
import { record } from "../components/record";
import type { Part, PartsModel } from "./model";

export function part_row(
  model: PartsModel,
  part: Sig<Part>,
): HTMLDivElement {
  const low = part.map((value) => value.stock <= value.reorder_at);

  return record(
    div(
      { class: "min-w-0 flex-1" },
      div(
        { class: "flex flex-wrap items-center gap-2" },
        strong({ class: "text-sm font-semibold" }, part.map((value) => value.name)),
        dynamicChild(
          low,
          (value) => value ? badge("Reorder", "warning") : badge("In stock", "success"),
        ),
      ),
      p(
        { class: "mt-1 text-sm text-neutral-500" },
        part.map((value) => `${value.sku} · Shelf ${value.location}`),
      ),
    ),
    div(
      { class: "flex items-center justify-between gap-5 md:justify-end" },
      div(
        { class: "text-right" },
        span({ class: "block text-xs text-neutral-400" }, "Available"),
        strong(
          {
            class: [
              "text-lg font-bold",
              () => low.get() ? "text-warning-700" : "text-neutral-800",
            ],
          },
          part.map((value) => value.stock),
        ),
      ),
      secondary_action(
        { onClick: () => model.receive(part.get().id), type: "button" },
        icon(PackagePlus, 15),
        "Receive 6",
      ),
    ),
  );
}
