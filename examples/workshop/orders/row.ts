import { Check, ChevronRight } from "lucide";
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
import type { OrdersModel, OrderStatus, WorkOrder } from "./model";

const status: Record<OrderStatus, { label: string; tone: BadgeTone }> = {
  bench: { label: "On bench", tone: "accent" },
  queued: { label: "Waiting", tone: "neutral" },
  ready: { label: "Ready", tone: "success" },
};

const next_action: Record<OrderStatus, string> = {
  bench: "Mark ready",
  queued: "Move to bench",
  ready: "Collected",
};

export function order_row(
  model: OrdersModel,
  order: Sig<WorkOrder>,
): HTMLDivElement {
  return record(
    div(
      { class: "flex min-w-0 flex-1 items-start gap-4" },
      div(
        {
          class: [
            "inline-flex h-10 w-10 shrink-0 items-center justify-center",
            "rounded-lg bg-neutral-100 text-sm font-bold text-neutral-600",
          ],
        },
        order.map((value) => String(value.id).slice(-2)),
      ),
      div(
        { class: "min-w-0" },
        div(
          { class: "flex flex-wrap items-center gap-2" },
          strong(
            { class: "truncate text-sm font-semibold" },
            order.map((value) => value.customer),
          ),
          dynamicChild(
            order.map((value) => value.status),
            (value) => badge(status[value].label, status[value].tone),
          ),
        ),
        p(
          { class: "mt-1 text-sm text-neutral-600" },
          order.map((value) => `${value.bike} · ${value.service}`),
        ),
        span(
          { class: "mt-1 text-xs text-neutral-400" },
          order.map((value) => `Promised ${value.promised}`),
        ),
      ),
    ),
    secondary_action(
      {
        class: "self-start md:self-center",
        onClick: () => model.advance(order.get().id),
        type: "button",
      },
      dynamicChild(
        order.map((value) => value.status),
        (value) => icon(value === "ready" ? Check : ChevronRight, 15),
      ),
      order.map((value) => next_action[value.status]),
    ),
  );
}
