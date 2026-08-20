import { mount, themes } from "@vaakx-dev/vrui";
import { create_workshop } from "./model";
import { workshop_view } from "./view";

mount(
  "app",
  { theme: themes.blue },
  workshop_view(create_workshop()),
);
