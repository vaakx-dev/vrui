import { describe, expect, it } from "vitest";
import { sig } from "./core";
import { button, div } from "./elements";
import { on_disconnect, on_mount } from "./lifecycle";
import { collect_scope, dispose_all } from "./scope";

async function flush_mutations(): Promise<void> {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("DOM lifecycle ownership", () => {
  it("mounts synchronously when a node is already connected", () => {
    const node = div();
    document.body.appendChild(node);
    let mounts = 0;

    on_mount(node, () => {
      mounts++;
    });

    expect(mounts).toBe(1);
    node.remove();
  });

  it("does not dispose a detached component during unrelated removals", async () => {
    const label = sig("before");
    let clicks = 0;
    const node = button({
      text: label,
      on_click: () => {
        clicks++;
      },
    });

    const unrelated = div();
    document.body.appendChild(unrelated);
    unrelated.remove();
    await flush_mutations();

    label.set("after");
    node.click();

    expect(node.textContent).toBe("after");
    expect(clicks).toBe(1);

    document.body.appendChild(node);
    await flush_mutations();
    node.remove();
    await flush_mutations();
  });

  it("runs disconnect cleanup only after a real connection", async () => {
    const node = div();
    let cleanups = 0;
    on_disconnect(node, () => {
      cleanups++;
    });

    const unrelated = div();
    document.body.appendChild(unrelated);
    unrelated.remove();
    await flush_mutations();
    expect(cleanups).toBe(0);

    document.body.appendChild(node);
    await flush_mutations();
    expect(cleanups).toBe(0);

    node.remove();
    await flush_mutations();
    expect(cleanups).toBe(1);

    node.remove();
    await flush_mutations();
    expect(cleanups).toBe(1);
  });

  it("allows a pending disconnect registration to be cancelled", async () => {
    const node = div();
    let cleanups = 0;
    const cancel = on_disconnect(node, () => {
      cleanups++;
    });

    cancel();
    document.body.appendChild(node);
    await flush_mutations();
    node.remove();
    await flush_mutations();

    expect(cleanups).toBe(0);
  });

  it("cancels pending mounts explicitly and with their owning scope", async () => {
    const explicitly_cancelled = div();
    let explicit_mounts = 0;
    const cancel = on_mount(explicitly_cancelled, () => {
      explicit_mounts++;
    });
    cancel();

    let scoped_mounts = 0;
    const created = collect_scope(() => {
      const node = div();
      on_mount(node, () => {
        scoped_mounts++;
      });
      return node;
    });
    dispose_all(created.scope);

    document.body.append(explicitly_cancelled, created.value);
    await flush_mutations();

    expect(explicit_mounts).toBe(0);
    expect(scoped_mounts).toBe(0);

    explicitly_cancelled.remove();
    created.value.remove();
    await flush_mutations();
  });

  it("does not clean up a node moved and reinserted in the same turn", async () => {
    const first = div();
    const second = div();
    const node = div();
    let cleanups = 0;

    document.body.append(first, second);
    first.appendChild(node);
    on_disconnect(node, () => {
      cleanups++;
    });

    node.remove();
    second.appendChild(node);
    await flush_mutations();

    expect(node.parentNode).toBe(second);
    expect(cleanups).toBe(0);

    node.remove();
    await flush_mutations();
    expect(cleanups).toBe(1);

    first.remove();
    second.remove();
    await flush_mutations();
  });

  it("runs mount cleanup once across disconnect and manual disposal", async () => {
    const node = div();
    let mounts = 0;
    let cleanups = 0;
    const dispose = on_mount(node, () => {
      mounts++;
      return () => {
        cleanups++;
      };
    });

    document.body.appendChild(node);
    await flush_mutations();
    expect(mounts).toBe(1);

    node.remove();
    await flush_mutations();
    dispose();

    expect(cleanups).toBe(1);
  });
});
