import { sig } from "@vaakx-dev/vrui";
import { create_orders } from "./orders/model";
import { create_parts } from "./parts/model";
import { create_schedule } from "./schedule/model";

export type Page = "orders" | "parts" | "schedule";

export function create_workshop() {
  return {
    orders: create_orders(),
    page: sig<Page>("orders"),
    parts: create_parts(),
    schedule: create_schedule(),
  };
}

export type WorkshopModel = ReturnType<typeof create_workshop>;
