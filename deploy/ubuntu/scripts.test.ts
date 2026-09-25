import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const dir = import.meta.dir;
const scripts = ["pack.sh", "push.sh", "bootstrap.sh", "install.sh", "configure-caddy.sh", "unix-account.sh"] as const;

test("deploy scripts are valid bash", () => {
  for (const name of scripts) {
    const result = Bun.spawnSync(["bash", "-n", join(dir, name)], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const stderr = new TextDecoder().decode(result.stderr).trim();
    expect(stderr).toBe("");
    expect(result.exitCode).toBe(0);
  }
});

test("systemd unit runs the prebuilt server bundle", () => {
  const unit = readFileSync(join(dir, "rgit-web.service"), "utf8");
  expect(unit).toContain("ExecStart=/opt/rgit-web/current/bin/bun dist/index.js");
  expect(unit).toContain("RGIT_WEB_PORT=3010");
  expect(unit).toContain("RABUN_GIT_CONFIG=/etc/rabun-git/rabun-git.toml");
  expect(unit).toContain("ReadWritePaths=/var/lib/rgit-web /var/cache/rgit-web /var/lib/rabun-git");
  expect(unit).toContain("SupplementaryGroups=rabun-git");
});

test("install refreshes the systemd unit and requires an HTML shell", () => {
  const install = readFileSync(join(dir, "install.sh"), "utf8");
  expect(install).toContain('cp "${SCRIPT_DIR}/rgit-web.service" /etc/systemd/system/rgit-web.service');
  expect(install).toContain('id="root"');
  expect(install).toContain("ufw allow 80/tcp");
  expect(install).toContain("ensure_rgit_web_unix_account");
});

test("bootstrap and install require the rabun-git group before starting the unit", () => {
  const helper = readFileSync(join(dir, "unix-account.sh"), "utf8");
  const bootstrap = readFileSync(join(dir, "bootstrap.sh"), "utf8");
  expect(helper).toContain("getent group rabun-git");
  expect(helper).toContain("usermod -aG rabun-git rgit-web");
  expect(helper).toContain("216/GROUP");
  expect(bootstrap).toContain("ensure_rgit_web_unix_account");
  expect(bootstrap).not.toContain("warning: rabun-git user is missing");
});

test("bootstrap tells the operator to set a web password inside rabun-git shell", () => {
  const bootstrap = readFileSync(join(dir, "bootstrap.sh"), "utf8");
  expect(bootstrap).toContain("operator: rabun-git shell");
  expect(bootstrap).toContain("rabun-git user passwd NAME --password");
  expect(bootstrap).not.toContain("rgit user passwd USER");
});

test("pack hoists HTML assets next to WorkingDirectory", () => {
  const pack = readFileSync(join(dir, "pack.sh"), "utf8");
  expect(pack).toContain('"$ROOT/build.ts" --server --outdir "$STAGE/dist"');
  expect(pack).toContain('cp -a "$f" "$STAGE/"');
  expect(pack).toContain("STAGE}/index.html");
  expect(pack).toContain("git describe --tags --always --dirty");
  expect(pack).toContain('echo "tag ${TAG}"');
});
