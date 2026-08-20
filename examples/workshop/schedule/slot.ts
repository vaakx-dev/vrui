import { Check, ChevronRight, Clock3 } from "lucide";
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
import { badge, type BadgeTone } from "../components/badge";
import { record } from "../components/record";
import type { ScheduleModel, ServiceSlot, SlotState } from "./model";

const states: Record<SlotState, { label: string; tone: BadgeTone }> = {
  booked: { label: "Booked", tone: "neutral" },
  done: { label: "Done", tone: "success" },
  "in-progress": { label: "In progress", tone: "accent" },
};

export function schedule_slot(
  model: ScheduleModel,
  slot: Sig<ServiceSlot>,
): HTMLDivElement {
  return record(
    div(
      { class: "flex w-24 shrink-0 items-center gap-2" },
      icon(Clock3, 15),
      strong({ class: "text-sm" }, slot.map((value) => value.time)),
    ),
    div(
      { class: "min-w-0 flex-1" },
      div(
        { class: "flex flex-wrap items-center gap-2" },
        strong({ class: "text-sm font-semibold" }, slot.map((value) => value.customer)),
        dynamicChild(
          slot.map((value) => value.state),
          (value) => badge(states[value].label, states[value].tone),
        ),
      ),
      p(
        { class: "mt-1 text-sm text-neutral-600" },
        slot.map((value) => `${value.bike} · ${value.service}`),
      ),
      span(
        { class: "mt-1 text-xs text-neutral-400" },
        slot.map((value) => `With ${value.technician}`),
      ),
    ),
    secondary_action(
      {
        class: "self-start md:self-center",
        disabled: slot.map((value) => value.state === "done"),
        onClick: () => model.advance(slot.get().id),
        type: "button",
      },
      dynamicChild(
        slot.map((value) => value.state),
        (value) => icon(value === "booked" ? ChevronRight : Check, 15),
      ),
      slot.map((value) => {
        if (value.state === "booked") return "Start service";
        return value.state === "in-progress" ? "Finish" : "Finished";
      }),
    ),
  );
}
