# dsh-workspace-file-tree

[English](README.md)

工作区文件树按共同的目录层级组织工作区切换器中的已登记工作区。
例如，即使 `/team` 尚未登记，`/team/api` 和 `/team/web` 仍会一起显示在 `team` 下方。

在新检出的目录中运行 `pnpm install --frozen-lockfile` 安装依赖并构建插件。
然后在 DSH 的**插件 → 添加插件**中选择该目录。
启用兼容版本的工作区切换器插件后，打开切换器并在分组选项中选择**按文件目录**。

准备好检出目录后，可运行 `npm run check` 在本地验证插件。

[项目文档](docs/README.md)
