import { describe, expect, it } from "vitest";
import { sig } from "./core";
import { button, div } from "./elements";
import { onDisconnect, onMount } from "./lifecycle";
import { collectScope, disposeAll } from "./scope";

async function flushMutations(): Promise<void> {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("DOM lifecycle ownership", () => {
  it("mounts synchronously when a node is already connected", () => {
    const node = div();
    document.body.appendChild(node);
    let mounts = 0;

    onMount(node, () => {
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
      onClick: () => {
        clicks++;
      },
    });

    const unrelated = div();
    document.body.appendChild(unrelated);
    unrelated.remove();
    await flushMutations();

    label.set("after");
    node.click();

    expect(node.textContent).toBe("after");
    expect(clicks).toBe(1);

    document.body.appendChild(node);
    await flushMutations();
    node.remove();
    await flushMutations();
  });

  it("runs disconnect cleanup only after a real connection", async () => {
    const node = div();
    let cleanups = 0;
    onDisconnect(node, () => {
      cleanups++;
    });

    const unrelated = div();
    document.body.appendChild(unrelated);
    unrelated.remove();
    await flushMutations();
    expect(cleanups).toBe(0);

    document.body.appendChild(node);
    await flushMutations();
    expect(cleanups).toBe(0);

    node.remove();
    await flushMutations();
    expect(cleanups).toBe(1);

    node.remove();
    await flushMutations();
    expect(cleanups).toBe(1);
  });

  it("allows a pending disconnect registration to be cancelled", async () => {
    const node = div();
    let cleanups = 0;
    const cancel = onDisconnect(node, () => {
      cleanups++;
    });

    cancel();
    document.body.appendChild(node);
    await flushMutations();
    node.remove();
    await flushMutations();

    expect(cleanups).toBe(0);
  });

  it("cancels pending mounts explicitly and with their owning scope", async () => {
    const explicitlyCancelled = div();
    let explicitMounts = 0;
    const cancel = onMount(explicitlyCancelled, () => {
      explicitMounts++;
    });
    cancel();

    let scopedMounts = 0;
    const created = collectScope(() => {
      const node = div();
      onMount(node, () => {
        scopedMounts++;
      });
      return node;
    });
    disposeAll(created.scope);

    document.body.append(explicitlyCancelled, created.value);
    await flushMutations();

    expect(explicitMounts).toBe(0);
    expect(scopedMounts).toBe(0);

    explicitlyCancelled.remove();
    created.value.remove();
    await flushMutations();
  });

  it("does not clean up a node moved and reinserted in the same turn", async () => {
    const first = div();
    const second = div();
    const node = div();
    let cleanups = 0;

    document.body.append(first, second);
    first.appendChild(node);
    onDisconnect(node, () => {
      cleanups++;
    });

    node.remove();
    second.appendChild(node);
    await flushMutations();

    expect(node.parentNode).toBe(second);
    expect(cleanups).toBe(0);

    node.remove();
    await flushMutations();
    expect(cleanups).toBe(1);

    first.remove();
    second.remove();
    await flushMutations();
  });

  it("runs mount cleanup once across disconnect and manual disposal", async () => {
    const node = div();
    let mounts = 0;
    let cleanups = 0;
    const dispose = onMount(node, () => {
      mounts++;
      return () => {
        cleanups++;
      };
    });

    document.body.appendChild(node);
    await flushMutations();
    expect(mounts).toBe(1);

    node.remove();
    await flushMutations();
    dispose();

    expect(cleanups).toBe(1);
  });
});
