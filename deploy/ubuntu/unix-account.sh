# Unix user/group for rgit-web.service (User=rgit-web, SupplementaryGroups=rabun-git).
# Sourced from bootstrap.sh and install.sh; must run as root.
#
# systemd maps a missing SupplementaryGroups= name to ESRCH
# ("Failed to determine supplementary groups: No such process", exit 216/GROUP).

ensure_rgit_web_unix_account() {
  if [[ "$(id -u)" -ne 0 ]]; then
    echo "ensure_rgit_web_unix_account: must run as root" >&2
    return 1
  fi

  getent group rgit-web >/dev/null || groupadd --system rgit-web
  if ! id -u rgit-web >/dev/null 2>&1; then
    useradd --system --gid rgit-web --home /var/lib/rgit-web --shell /usr/sbin/nologin rgit-web
  fi
  install -d -m 0755 -o rgit-web -g rgit-web /var/lib/rgit-web /var/cache/rgit-web

  if ! getent group rabun-git >/dev/null; then
    echo "Unix group rabun-git is missing; systemd cannot start rgit-web.service (216/GROUP)." >&2
    echo "Install the forge on this host first, then re-run bootstrap/install." >&2
    return 1
  fi
  usermod -aG rabun-git rgit-web
}
