import {
  button,
  div,
  list,
  onInterval,
  show,
  span,
} from "@vaakx-dev/vrui";
import { empty_state } from "../components/empty";
import { feature_page, page_heading } from "../components/page";
import { panel } from "../components/panel";
import type { ScheduleModel } from "./model";
import { schedule_days } from "./model";
import { schedule_slot } from "./slot";

export function schedule_view(model: ScheduleModel): HTMLElement {
  return div(
    { class: "contents", onMount: () => onInterval(model.tick, 60_000) },
    feature_page(
      "normal",
      page_heading(
        "Workshop floor",
        "Schedule",
        "Service appointments and bench hand-offs.",
        span(
          {
            class: [
              "rounded-full bg-neutral-100 px-3 py-2",
              "text-sm font-semibold text-neutral-600",
            ],
          },
          model.current_time,
        ),
      ),
      div(
        { class: "flex gap-2 overflow-auto" },
        schedule_days.map((day) => button(
          {
            "aria-pressed": model.day.map((current) => current === day),
            class: [
              "whitespace-nowrap rounded-lg border border-solid border-neutral-200",
              "bg-white px-4 py-2 font-sans text-sm font-semibold text-neutral-600",
              "outline-none cursor-pointer transition-colors hover:bg-neutral-100",
              "focus-visible:ring-2 focus-visible:ring-accent-200",
              () => model.day.get() === day &&
                "border-accent-600 bg-accent-600 text-white",
            ],
            onClick: model.day.setter(day),
            type: "button",
          },
          day,
        )),
      ),
      panel(
        {
          description: span("Select a day to see its bookings."),
          title: model.day,
        },
        list(
          model.visible,
          (slot) => slot.id,
          (slot) => schedule_slot(model, slot),
          div({ class: "flex flex-col gap-5" }),
        ),
        show(
          model.empty,
          () => empty_state(
            "No bookings",
            "This day is clear for walk-in work.",
          ),
        ),
      ),
    ),
  );
}
