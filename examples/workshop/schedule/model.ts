import { derive, sig } from "@vaakx-dev/vrui";

export type ScheduleDay = "Tue 20" | "Wed 21" | "Thu 22" | "Fri 23";
export type SlotState = "booked" | "done" | "in-progress";

export type ServiceSlot = {
  bike: string;
  customer: string;
  day: ScheduleDay;
  id: number;
  service: string;
  state: SlotState;
  technician: string;
  time: string;
};

export const schedule_days: ReadonlyArray<ScheduleDay> = [
  "Tue 20",
  "Wed 21",
  "Thu 22",
  "Fri 23",
];

const initial: ServiceSlot[] = [
  { bike: "Surly Straggler", customer: "Nadia Chen", day: "Tue 20", id: 1, service: "Brake service", state: "in-progress", technician: "Maya", time: "8:30" },
  { bike: "Specialized Allez", customer: "Owen Price", day: "Tue 20", id: 2, service: "Gear adjustment", state: "booked", technician: "Jon", time: "10:00" },
  { bike: "Giant Talon", customer: "Rosa Patel", day: "Tue 20", id: 3, service: "Collection", state: "done", technician: "Front desk", time: "13:30" },
  { bike: "Trek Domane", customer: "Elliot Ward", day: "Wed 21", id: 4, service: "Full tune", state: "booked", technician: "Maya", time: "9:00" },
  { bike: "Cannondale Quick", customer: "Sam Bell", day: "Thu 22", id: 5, service: "Drivetrain clean", state: "booked", technician: "Jon", time: "14:00" },
  { bike: "Norco Search", customer: "Ari Moss", day: "Fri 23", id: 6, service: "Wheel true", state: "booked", technician: "Maya", time: "11:30" },
];

function time_label(): string {
  return new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());
}

export function create_schedule() {
  const slots = sig(initial);
  const day = sig<ScheduleDay>("Tue 20");
  const current_time = sig(time_label());
  const visible = derive(() => slots.get().filter((slot) => slot.day === day.get()));
  const empty = derive(() => visible.get().length === 0);

  function advance(id: number): void {
    slots.update((items) => items.map((slot) => {
      if (slot.id !== id) return slot;
      const state: SlotState = slot.state === "booked"
        ? "in-progress"
        : "done";
      return { ...slot, state };
    }));
  }

  function tick(): void {
    current_time.set(time_label());
  }

  return { advance, current_time, day, empty, slots, tick, visible };
}

export type ScheduleModel = ReturnType<typeof create_schedule>;
