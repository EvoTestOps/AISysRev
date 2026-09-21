# Documentation

For an overview of the project and how to run it, see the [main README](../README.md).

## For users

| Document | Contents |
| --- | --- |
| [pdf-screening.md](pdf-screening.md) | How full-text PDF screening works |
| [local-models.md](local-models.md) | Using local LLMs (e.g. LM Studio) |
| [llm-models/functional.md](llm-models/functional.md), [llm-models/non-functional.md](llm-models/non-functional.md) | Snapshot of which OpenRouter models worked when tested |

## For developers

| Document | Contents |
| --- | --- |
| [architecture.md](architecture.md) | Services, request flow and port mapping |
| [database.md](database.md) | Database diagram |
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | Development workflow, checks and documentation rules |
| [maintenance.md](maintenance.md) | Upgrading dependencies and Docker images, Dependabot |
| [releasing.md](releasing.md) | Creating a tag and a GitHub release |
| [manual-installation.md](manual-installation.md) | Running the client and server without Docker |
| [../server/README.md](../server/README.md) | Server layout and commands |
| [../fuzzing/README.md](../fuzzing/README.md) | API fuzzing tools |

## When to update what

Update the docs in the same pull request as the change that makes them wrong.

| If you change... | Update... |
| --- | --- |
| Compose files, `Caddyfile`, ports or services | [architecture.md](architecture.md) (diagram and port table) |
| SQLAlchemy models, or a migration that changes tables | [database.md](database.md) |
| PDF screening behavior | [pdf-screening.md](pdf-screening.md) |
| Makefile targets, run commands or supported setup | [../README.md](../README.md) |
| Server layout or environment variables | [../server/README.md](../server/README.md) |
| Node, Python, uv or base image versions | every place listed in [maintenance.md](maintenance.md#where-versions-are-defined) |
| A new doc file | the index above |

## Images

Diagrams and screenshots used by the documents are in [images/](images/). The `*.yuml.txt` files are the [yUML](https://yuml.me/) sources of the matching SVGs.
