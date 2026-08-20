import { Plus, Trash2 } from "lucide";
import {
  button,
  div,
  form,
  h1,
  icon,
  input,
  list,
  main,
  p,
  preventThen,
  section,
  show,
  span,
  type Sig,
} from "@vaakx-dev/vrui";
import type { Task, TaskFilter, TasksModel } from "./model";

const filters: ReadonlyArray<{ label: string; value: TaskFilter }> = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "done" },
];

function task_row(model: TasksModel, task: Sig<Task>): HTMLDivElement {
  const done = task.map((value) => value.done);

  return div(
    {
      class: [
        "flex items-center gap-4 rounded-xl border border-solid",
        "border-neutral-200 bg-white p-4 shadow-xs transition-colors",
        () => done.get() && "opacity-50",
      ],
    },
    button(
      {
        "aria-label": () => done.get() ? "Mark active" : "Mark complete",
        "aria-pressed": done,
        class: [
          "inline-flex h-8 w-8 shrink-0 items-center justify-center",
          "rounded-full border-2 border-solid border-neutral-300 bg-white",
          "font-sans text-sm font-bold text-white outline-none cursor-pointer",
          "focus-visible:ring-2 focus-visible:ring-accent-200",
          () => done.get() && "border-success-600 bg-success-600",
        ],
        onClick: () => model.toggle(task.get().id),
        type: "button",
      },
      () => done.get() ? "✓" : "",
    ),
    div(
      { class: "flex min-w-0 flex-1 flex-col gap-1" },
      span(
        { class: "truncate text-sm font-semibold text-neutral-900" },
        task.map((value) => value.title),
      ),
      span(
        { class: "text-xs text-neutral-500" },
        task.map((value) => `${value.project} · ${value.due}`),
      ),
    ),
    button(
      {
        "aria-label": "Delete task",
        class: [
          "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          "border border-solid border-neutral-200 bg-white text-neutral-500",
          "outline-none cursor-pointer transition-colors hover:bg-danger-50",
          "hover:text-danger-700 focus-visible:ring-2 focus-visible:ring-accent-200",
        ],
        onClick: () => model.remove(task.get().id),
        type: "button",
      },
      icon(Trash2, 16),
    ),
  );
}

export function tasks_view(model: TasksModel): HTMLElement {
  return main(
    {
      class: [
        "fixed inset-0 box-border overflow-auto bg-neutral-50",
        "p-5 font-sans text-neutral-900 md:p-8",
      ],
    },
    section(
      { class: "mx-auto flex w-full max-w-3xl flex-col gap-6" },
      div(
        { class: "flex flex-wrap items-end justify-between gap-4" },
        div(
          p({ class: "mb-1 text-sm font-semibold text-accent-600" }, "Today"),
          h1({ class: "text-3xl font-bold" }, "Tasks"),
          p({ class: "mt-2 text-neutral-500" }, "Keep track of what needs doing."),
        ),
        span(
          {
            class: [
              "inline-flex rounded-full bg-accent-50 px-3 py-1",
              "text-sm font-semibold text-accent-700",
            ],
          },
          model.remaining,
          " active",
        ),
      ),
      form(
        {
          class: "flex flex-col gap-3 rounded-xl bg-neutral-900 p-4 sm:flex-row",
          onSubmit: preventThen(model.add),
        },
        input({
          "aria-label": "New task",
          bindValue: model.draft,
          class: [
            "box-border flex-1 appearance-none rounded-lg border border-solid",
            "border-neutral-300 bg-white px-3 py-2 font-sans text-sm",
            "text-neutral-900 outline-none focus:border-accent-500 focus:ring-2",
            "focus:ring-accent-100",
          ],
          placeholder: "What needs doing?",
        }),
        button(
          {
            class: [
              "inline-flex items-center justify-center gap-2 rounded-lg border",
              "border-solid border-accent-600 bg-accent-600 px-4 py-2 font-sans",
              "text-sm font-semibold text-white outline-none cursor-pointer",
              "transition-colors hover:bg-accent-700 focus-visible:ring-2",
              "focus-visible:ring-accent-300 disabled:pointer-events-none disabled:opacity-50",
            ],
            disabled: model.can_add.map((value) => !value),
            type: "submit",
          },
          icon(Plus, 16),
          "Add task",
        ),
      ),
      div(
        { class: "flex flex-wrap items-center gap-2" },
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
      list(
        model.visible,
        (task) => task.id,
        (task) => task_row(model, task),
        div({ class: "flex flex-col gap-3" }),
      ),
      show(
        model.empty,
        () => div(
          {
            class: [
              "rounded-xl border border-solid border-neutral-200 bg-white",
              "p-8 text-center shadow-xs",
            ],
          },
          p({ class: "text-lg font-semibold" }, "Nothing here"),
          p(
            { class: "mt-2 text-sm text-neutral-500" },
            "Choose another filter or add a task.",
          ),
        ),
      ),
    ),
  );
}
