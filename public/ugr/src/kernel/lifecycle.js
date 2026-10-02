import { getModule } from "./registry.js";

export async function mount(id, rootEl) {
  const mod = getModule(id);
  if (!mod) throw new Error(`module not found: ${id}`);
  if (mod.mount) {
    await mod.mount(rootEl);
  }
}

export async function unmount(id) {
  const mod = getModule(id);
  if (!mod) return;
  if (mod.unmount) {
    await mod.unmount();
  } else if (mod.stop) {
    await mod.stop();
  }
}