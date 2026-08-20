import { batch, derive, sig } from "@vaakx-dev/vrui";

export type Task = {
  done: boolean;
  due: string;
  id: number;
  project: string;
  title: string;
};

export type TaskFilter = "active" | "all" | "done";

const initial: Task[] = [
  { done: false, due: "Today", id: 1, project: "Website", title: "Review the launch checklist" },
  { done: true, due: "Today", id: 2, project: "Product", title: "Write the release notes" },
  { done: false, due: "Tomorrow", id: 3, project: "Research", title: "Compare onboarding flows" },
];

export function create_tasks() {
  const tasks = sig(initial);
  const draft = sig("");
  const filter = sig<TaskFilter>("all");
  const visible = derive(() => tasks.get().filter((task) => {
    if (filter.get() === "active") return !task.done;
    if (filter.get() === "done") return task.done;
    return true;
  }));
  const remaining = derive(() => tasks.get().filter((task) => !task.done).length);
  const empty = derive(() => visible.get().length === 0);
  const can_add = derive(() => draft.get().trim().length > 0);
  let next_id = 4;

  function add(): void {
    const title = draft.get().trim();
    if (!title) return;

    batch(() => {
      tasks.update((items) => [
        { done: false, due: "Today", id: next_id++, project: "Inbox", title },
        ...items,
      ]);
      draft.set("");
    });
  }

  function toggle(id: number): void {
    tasks.update((items) => items.map((task) => (
      task.id === id ? { ...task, done: !task.done } : task
    )));
  }

  function remove(id: number): void {
    tasks.update((items) => items.filter((task) => task.id !== id));
  }

  return {
    add,
    can_add,
    draft,
    empty,
    filter,
    remaining,
    remove,
    tasks,
    toggle,
    visible,
  };
}

export type TasksModel = ReturnType<typeof create_tasks>;
