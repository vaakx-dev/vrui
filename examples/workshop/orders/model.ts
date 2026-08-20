import { batch, derive, sig } from "@vaakx-dev/vrui";

export type OrderStatus = "bench" | "queued" | "ready";

export type WorkOrder = {
  bike: string;
  customer: string;
  id: number;
  promised: string;
  service: string;
  status: OrderStatus;
};

export type OrderFilter = "active" | OrderStatus;

const initial: WorkOrder[] = [
  { bike: "Surly Straggler", customer: "Nadia Chen", id: 101, promised: "Tue 4:00 pm", service: "Brake service", status: "bench" },
  { bike: "Trek Domane", customer: "Elliot Ward", id: 102, promised: "Wed 10:00 am", service: "Full tune", status: "queued" },
  { bike: "Giant Talon", customer: "Rosa Patel", id: 103, promised: "Today", service: "Tubeless setup", status: "ready" },
  { bike: "Cannondale Quick", customer: "Sam Bell", id: 104, promised: "Thu 2:00 pm", service: "Drivetrain clean", status: "queued" },
  { bike: "Specialized Allez", customer: "Owen Price", id: 105, promised: "Today", service: "Gear adjustment", status: "bench" },
];

function create_editor(add: (draft: Omit<WorkOrder, "id" | "status">) => void) {
  const open = sig(false);
  const customer = sig("");
  const bike = sig("");
  const service = sig("Full tune");
  const promised = sig("");
  const valid = derive(() => (
    customer.get().trim().length > 0 &&
    bike.get().trim().length > 0 &&
    promised.get().trim().length > 0
  ));

  function begin(): void {
    batch(() => {
      customer.set("");
      bike.set("");
      service.set("Full tune");
      promised.set("");
      open.set(true);
    });
  }

  function close(): void {
    open.set(false);
  }

  function submit(): void {
    if (!valid.get()) return;
    add({
      bike: bike.get().trim(),
      customer: customer.get().trim(),
      promised: promised.get().trim(),
      service: service.get(),
    });
    close();
  }

  return { begin, bike, close, customer, open, promised, service, submit, valid };
}

export function create_orders() {
  const orders = sig(initial);
  const query = sig("");
  const filter = sig<OrderFilter>("active");
  const visible = derive(() => {
    const term = query.get().trim().toLowerCase();
    const selected = filter.get();
    return orders.get().filter((order) => {
      const matches_filter = selected === "active" || order.status === selected;
      const matches_query = !term ||
        order.customer.toLowerCase().includes(term) ||
        order.bike.toLowerCase().includes(term) ||
        order.service.toLowerCase().includes(term);
      return matches_filter && matches_query;
    });
  });
  const empty = derive(() => visible.get().length === 0);
  const queued_count = derive(() => orders.get().filter((order) => order.status === "queued").length);
  const bench_count = derive(() => orders.get().filter((order) => order.status === "bench").length);
  const ready_count = derive(() => orders.get().filter((order) => order.status === "ready").length);
  let next_id = 106;

  function add(draft: Omit<WorkOrder, "id" | "status">): void {
    orders.update((items) => [
      { ...draft, id: next_id++, status: "queued" },
      ...items,
    ]);
  }

  function advance(id: number): void {
    orders.update((items) => items.flatMap((order) => {
      if (order.id !== id) return [order];
      if (order.status === "ready") return [];
      return [{
        ...order,
        status: order.status === "queued" ? "bench" : "ready",
      }];
    }));
  }

  return {
    advance,
    bench_count,
    editor: create_editor(add),
    empty,
    filter,
    orders,
    query,
    queued_count,
    ready_count,
    visible,
  };
}

export type OrdersModel = ReturnType<typeof create_orders>;
export type OrderEditor = OrdersModel["editor"];
