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
  ensure_forge_group_write
  ensure_git_safe_directory
}

# Group-write the forge paths rgit-web mutates (repo create, tokens, visibility).
ensure_forge_group_write() {
  local root=/var/lib/rabun-git
  if [[ ! -d "$root" ]]; then
    return 0
  fi
  chgrp rabun-git "$root" || true
  chmod 2770 "$root" || true
  local dir
  for dir in keys repos runs; do
    install -d -m 2770 -o rabun-git -g rabun-git "$root/$dir"
    find "$root/$dir" -type d -exec chmod 2770 {} \; 2>/dev/null || true
    find "$root/$dir" -type f -exec chmod g+rw {} \; 2>/dev/null || true
    chgrp -R rabun-git "$root/$dir" 2>/dev/null || true
  done
  chmod 0660 "$root"/tokens.yaml "$root"/access.yaml "$root"/visibility.yaml "$root"/users.yaml 2>/dev/null || true
}

# Git 2.35+ refuses repos whose directory uid ≠ the process uid. Serve is
# rabun-git; web create is rgit-web. `*` is the documented wildcard.
ensure_git_safe_directory() {
  if ! command -v git >/dev/null; then
    return 0
  fi
  if git config --system --get-all safe.directory 2>/dev/null | grep -qx '\*'; then
    return 0
  fi
  git config --system --add safe.directory '*'
}
