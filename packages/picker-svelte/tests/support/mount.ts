import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { compile } from "svelte/compiler";
import { flushSync, mount, tick, unmount } from "svelte";

const packageRoot = fileURLToPath(new URL("../..", import.meta.url));
export const entryUrl = pathToFileURL(
  join(packageRoot, "dist", "index.js"),
).href;

const directory = mkdtempSync(join(packageRoot, "tests", "fixtures-"));
let count = 0;
export const cleanupFixtures = (): void =>
  rmSync(directory, { recursive: true, force: true });

export type Mounted = { target: HTMLElement; destroy(): void };

/** Compile a Svelte source string and mount it into a fresh element. */
export async function mountSource(
  source: string,
  initial: object = {},
): Promise<Mounted> {
  count += 1;
  const compiled = compile(source, {
    generate: "client",
    dev: true,
    filename: `fixture-${count}.svelte`,
  });
  const file = join(directory, `fixture-${count}.mjs`);
  writeFileSync(file, compiled.js.code, "utf8");
  const module = (await import(pathToFileURL(file).href)) as {
    default: Parameters<typeof mount>[0];
  };
  const target = document.createElement("div");
  document.body.append(target);
  const app = mount(module.default, { target, props: { initial } });
  flushSync();
  await tick();
  return {
    target,
    destroy() {
      unmount(app as never);
      target.remove();
    },
  };
}

export const settle = async (ms = 30): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
  flushSync();
  await tick();
};
