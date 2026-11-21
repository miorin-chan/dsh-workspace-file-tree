# dsh-workspace-file-tree

[简体中文](README.zh.md)

Workspace file tree groups registered workspaces by their shared directories in the workspace switcher.
For example, `/team/api` and `/team/web` appear under `team` even if `/team` itself is unregistered.

Use **Plugins → Add plugin** in DSH to install this directory.
With a compatible version of the workspace switcher plugin enabled, open the switcher and choose **Directory tree**
from its grouping options.

Run `pnpm install`, `npm run build`, and `npm run check` to build and verify the plugin locally.

[Project documentation](docs/README.md)
