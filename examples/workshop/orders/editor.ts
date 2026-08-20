import {
  div,
  form,
  h2,
  p,
  preventThen,
  stop,
} from "@vaakx-dev/vrui";
import { primary_action, secondary_action } from "../components/action";
import { select_field, text_field } from "../components/field";
import type { OrderEditor } from "./model";

const services = [
  { label: "Full tune", value: "Full tune" },
  { label: "Brake service", value: "Brake service" },
  { label: "Gear adjustment", value: "Gear adjustment" },
  { label: "Wheel true", value: "Wheel true" },
  { label: "Tubeless setup", value: "Tubeless setup" },
];

export function order_editor(model: OrderEditor): HTMLFormElement {
  return form(
    {
      class: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4",
      onClick: model.close,
      onSubmit: preventThen(model.submit),
    },
    div(
      {
        "aria-modal": "true",
        class: [
          "box-border flex w-full max-w-xl flex-col gap-6 rounded-2xl",
          "bg-white p-5 shadow-xl md:p-6",
        ],
        onClick: stop,
        role: "dialog",
      },
      div(
        h2({ class: "text-xl font-bold" }, "New work order"),
        p(
          { class: "mt-2 text-sm text-neutral-500" },
          "Add the bike to the service queue. Parts can be assigned once it reaches a bench.",
        ),
      ),
      div(
        { class: "grid grid-cols-1 gap-4 sm:grid-cols-2" },
        text_field("Customer", {
          bindValue: model.customer,
          placeholder: "Customer name",
        }),
        text_field("Bike", {
          bindValue: model.bike,
          placeholder: "Make and model",
        }),
        select_field(
          "Service",
          { bindValue: model.service },
          services,
        ),
        text_field("Promised", {
          bindValue: model.promised,
          placeholder: "Friday, 4:00 pm",
        }),
      ),
      div(
        { class: "flex flex-wrap justify-end gap-3" },
        secondary_action({ onClick: model.close, type: "button" }, "Cancel"),
        primary_action(
          {
            disabled: model.valid.map((value) => !value),
            type: "submit",
          },
          "Create work order",
        ),
      ),
    ),
  );
}
