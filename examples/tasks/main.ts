import { mount, themes } from "@vaakx-dev/vrui";
import { create_tasks } from "./model";
import { tasks_view } from "./view";

mount("app", { theme: themes.indigo }, tasks_view(create_tasks()));
