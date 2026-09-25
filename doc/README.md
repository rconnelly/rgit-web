# Documentation

rgit-web is the GitHub-style browser for [rgit](https://github.com/rconnelly/rgit) (crate name `rabun-git`). This repo is presentation only. The forge CLI owns authentication, ACL, and git.

## Contents

| Page | What it covers |
| --- | --- |
| [Develop](develop.md) | Local Bun app, `rgit` on PATH, first web password |
| [Ubuntu deploy](deploy-ubuntu.md) | Pack → push → install; Caddy; `rgit-web` user |
| [Architecture](architecture/README.md) | Split with rgit, request flow, theming |
| [Decisions](architecture/decisions/README.md) | Numbered records of the forks we took |

Operator commands and on-disk forge layout stay in the rgit guide:

- [User guide](https://github.com/rconnelly/rgit/blob/master/doc/README.md)
- [Architecture](https://github.com/rconnelly/rgit/blob/master/doc/architecture.md)
- [Commands](https://github.com/rconnelly/rgit/blob/master/doc/commands.md)
