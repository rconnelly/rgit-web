import tailwind from "bun-plugin-tailwind";
import { rm } from "node:fs/promises";
import path from "node:path";

export function htmlEntrypoints(cwd = process.cwd()): string[] {
  return [...new Bun.Glob("src/**/*.html").scanSync({ cwd })];
}

async function assertBuild(result: Bun.BuildOutput) {
  if (!result.success) {
    const detail = result.logs.map(String).join("\n");
    throw new Error(detail || "Bun.build failed");
  }
  return result;
}

export async function buildApp(cwd = process.cwd()) {
  const outdir = path.join(cwd, "dist");
  await rm(outdir, { recursive: true, force: true });
  const entrypoints = htmlEntrypoints(cwd).map((file) => path.join(cwd, file));
  if (entrypoints.length === 0) {
    throw new Error("No HTML entrypoints found");
  }
  return assertBuild(
    await Bun.build({
      entrypoints,
      outdir,
      plugins: [tailwind],
      minify: true,
      target: "browser",
      sourcemap: "linked",
      define: { "process.env.NODE_ENV": JSON.stringify("production") },
    }),
  );
}

/** AOT server + HTML shell. `bun build` CLI skips bunfig Tailwind plugins. */
export async function buildServer(options: { cwd?: string; outdir: string }) {
  const cwd = options.cwd ?? process.cwd();
  await rm(options.outdir, { recursive: true, force: true });
  return assertBuild(
    await Bun.build({
      entrypoints: [path.join(cwd, "src/index.ts")],
      outdir: options.outdir,
      target: "bun",
      minify: true,
      plugins: [tailwind],
      publicPath: "/",
      define: { "process.env.NODE_ENV": JSON.stringify("production") },
    }),
  );
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const server = argv.includes("--server");
  const outdirFlag = argv.indexOf("--outdir");
  const flaggedOutdir = outdirFlag >= 0 ? argv[outdirFlag + 1] : undefined;
  const outdir = flaggedOutdir || path.join(process.cwd(), "dist");
  const result = server ? await buildServer({ outdir }) : await buildApp();
  for (const output of result.outputs) {
    console.log(` ${path.relative(process.cwd(), output.path)}  ${(output.size / 1024).toFixed(1)} KB`);
  }
}
