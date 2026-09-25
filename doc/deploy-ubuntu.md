# Ubuntu deploy

rgit-web is a systemd unit plus a release archive on an **x86_64 (or aarch64) Ubuntu** host that already (or will) run **rabun-git**. Same air-gapped flow as Burton and rgit: this machine packs or downloads the tarball and `scp`s it. The droplet never talks to GitHub.

Caddy terminates TLS and reverse-proxies loopback **3010**. Git clone/push stays on **TCP 2222** via `rabun-git serve`.

## 1. Host

Ubuntu 24.04 LTS. Install the forge first ([rgit Ubuntu deploy](https://github.com/rconnelly/rgit/blob/master/doc/deploy-ubuntu.md)) so `/usr/local/bin/rgit`, `/etc/rabun-git/`, and `/var/lib/rabun-git` exist.

- SSH keys on the host (port 22) so `push.sh` can copy the archive
- **bun** is not required on the server; the archive ships the binary
- Firewall: browsers hit 80/443; git clients still use 2222

Do **not** `curl | bash` the bootstrap script from GitHub.

## 2. Bootstrap (once)

From this clone on a Linux pack host:

```bash
./deploy/ubuntu/push.sh --pack --bootstrap --domain git.example.com user@HOST
```

`--domain` is the Caddy virtual host (default `git.burton.work` if omitted). `--tls lan` uses Caddy’s local CA on a private network. `--email` is the ACME contact when Let’s Encrypt is used.

Bootstrap:

- Creates system user `rgit-web` and `/etc/rgit-web/`
- Requires Unix group `rabun-git`, adds `rgit-web` to it, and group-writes the forge root
- Installs `rgit-web.service` and the Caddy snippet
- Unpacks the archive to `/opt/rgit-web/releases/<tag>` and points `current`

`SupplementaryGroups=rabun-git` is mandatory. If that group is missing, systemd exits `216/GROUP` (`Failed to determine supplementary groups: No such process`) and never binds 3010. Bootstrap and `install.sh` now fail before enabling the unit instead of warning and continuing.

After bootstrap, set web passwords from an operator session. Mutating `user` commands refuse to run as root or your login user so `/var/lib/rabun-git` stays owned by `rabun-git`:

```bash
rabun-git shell          # or: sudo rabun-git shell
rabun-git user list
rabun-git user passwd ada --password '…'
exit
```

`user add … --password` also works for a new forge login. SSH clone still uses keys; this password is only for the website.

The website talks to **this host’s** forge (`RABUN_GIT_ROOT=/var/lib/rabun-git`). `rgit origin …` on a laptop is a different remote (for example damascus) and does not create a web.rgit.rs login.

## 3. Later deploys

```bash
./deploy/ubuntu/push.sh --pack user@HOST
```

Inspect first:

```bash
./deploy/ubuntu/pack.sh
./deploy/ubuntu/push.sh --archive dist/release/rgit-web-<tag>-x86_64-unknown-linux-gnu.tar.gz user@HOST
```

`install.sh` keeps five releases, restarts systemd, and waits for `GET /api/health` plus an HTML shell with `id="root"`.

## Layout on the host

| Path | Role |
| --- | --- |
| `/opt/rgit-web/current` | Symlink to the active release |
| `/etc/rgit-web/rgit-web.env` | Bind, `RGIT_BIN`, cookie flags |
| `/etc/rabun-git/rabun-git.toml` | Forge config the CLI reads |
| `/var/lib/rabun-git` | Users, tokens, bare repos (owned by `rabun-git`, group-writable) |
| `/etc/caddy/sites-enabled/rgit-web.caddy` | Virtual host → `127.0.0.1:3010` |

The unit is `User=rgit-web` with `SupplementaryGroups=rabun-git` and `ReadWritePaths` including `/var/lib/rabun-git` so `rgit --json --token …` can issue tokens and merge requests. See [0007](architecture/decisions/0007-same-host-group-access.md). Install and bootstrap refuse to start the unit if `getent group rabun-git` fails.
