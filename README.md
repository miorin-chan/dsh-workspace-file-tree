# dsh-workspace-file-tree

[简体中文](README.zh.md)

Workspace file tree groups registered workspaces by their shared directories in the workspace switcher.
For example, `/team/api` and `/team/web` appear under `team` even if `/team` itself is unregistered.

Run `pnpm install --frozen-lockfile` in a fresh checkout to install dependencies and build the plugin.
Then select the directory in DSH under **Plugins → Add plugin**.
With a compatible version of the workspace switcher plugin enabled, open the switcher and choose **Directory tree**
from its grouping options.

After preparing the checkout, use `npm run check` to verify the plugin locally.

[Project documentation](docs/README.md)
