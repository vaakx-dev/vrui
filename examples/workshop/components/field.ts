import {
  input,
  label,
  option,
  select,
  span,
  type Child,
  type Props,
} from "@vaakx-dev/vrui";

const control_class = [
  "box-border w-full appearance-none rounded-lg border border-solid",
  "border-neutral-300 bg-white px-3 py-2 font-sans text-sm text-neutral-900",
  "outline-none transition-colors focus:border-accent-500 focus:ring-2",
  "focus:ring-accent-100",
].join(" ");

function field(
  label_text: string,
  control: Child,
  help?: string,
): HTMLLabelElement {
  return label(
    { class: "flex flex-col gap-2" },
    span({ class: "text-sm font-semibold text-neutral-700" }, label_text),
    control,
    help && span({ class: "text-xs text-neutral-500" }, help),
  );
}

export function text_field(
  label_text: string,
  props: Props<HTMLInputElement>,
  help?: string,
): HTMLLabelElement {
  const { class: class_name, ...input_props } = props;
  return field(
    label_text,
    input({ ...input_props, class: [control_class, class_name] }),
    help,
  );
}

export function select_field(
  label_text: string,
  props: Props<HTMLSelectElement>,
  choices: ReadonlyArray<{ label: string; value: string }>,
): HTMLLabelElement {
  const { class: class_name, ...select_props } = props;
  return field(
    label_text,
    select(
      { ...select_props, class: [control_class, class_name] },
      choices.map((choice) => option({ value: choice.value }, choice.label)),
    ),
  );
}
