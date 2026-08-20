import { span } from "@vaakx-dev/vrui";

export type BadgeTone = "accent" | "danger" | "neutral" | "success" | "warning";

const appearances: Record<BadgeTone, string> = {
  accent: "bg-accent-50 text-accent-700",
  danger: "bg-danger-50 text-danger-700",
  neutral: "bg-neutral-100 text-neutral-600",
  success: "bg-success-50 text-success-700",
  warning: "bg-warning-50 text-warning-700",
};

export function badge(label: string, tone: BadgeTone): HTMLSpanElement {
  return span(
    {
      class: [
        "inline-flex w-fit items-center rounded-full px-2 py-1",
        "text-xs font-semibold",
        appearances[tone],
      ],
    },
    label,
  );
}
