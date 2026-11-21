export interface WorkspacePath {
  readonly workspaceId: string
  readonly path: string
}

export type WorkspaceGroupNode =
  | { readonly kind: 'workspace'; readonly workspaceId: string; readonly children?: readonly WorkspaceGroupNode[] }
  | {
    readonly kind: 'directory'
    readonly key: string
    readonly title: string
    readonly path: string
    readonly children: readonly WorkspaceGroupNode[]
  }

type Branch = WorkspaceGroupNode & { children: Branch[] }

interface PathEntry {
  readonly key: string
  readonly path: string
  readonly title: string
  readonly parent: PathEntry | undefined
  childCount: number
  branch?: Branch
}

interface AbsolutePath {
  readonly root: string
  readonly segments: readonly string[]
  readonly windows: boolean
}

function absolutePath(path: string): AbsolutePath | undefined {
  const drive = /^[A-Za-z]:[/\\]/.test(path)
  // Recognize UNC using either separator. The server and share form one indivisible root.
  const unc = /^(?:\\\\|\/\/)([^/\\]+)[/\\]+([^/\\]+)(?:[/\\]|$)/.exec(path)
  if (drive) {
    return { root: `${path.slice(0, 2).toUpperCase()}/`, segments: path.slice(3).split(/[/\\]+/), windows: true }
  }
  if (unc) {
    return { root: `//${unc[1]}/${unc[2]}`, segments: path.slice(unc[0].length).split(/[/\\]+/), windows: true }
  }
  if (path.startsWith('/')) return { root: '/', segments: path.split('/'), windows: false }
  return undefined
}

/** Port the switcher's two-pass grouping: index directory forks, then attach to the nearest visible ancestor. */
export function project(workspaces: readonly WorkspacePath[]): readonly WorkspaceGroupNode[] {
  const paths = new Map<string, PathEntry>()
  function entry(path: string, title: string, windows: boolean, parent?: PathEntry): PathEntry {
    const key = windows ? path.toLowerCase() : path
    const existing = paths.get(key)
    if (existing !== undefined) return existing
    const created = { key, path, title, parent, childCount: 0 }
    paths.set(key, created)
    if (parent !== undefined) parent.childCount++
    return created
  }

  const workspacesWithPaths = workspaces.map(({ workspaceId, path }) => {
    const branch: Branch = { kind: 'workspace', workspaceId, children: [] }
    const parsed = absolutePath(path)
    if (parsed === undefined) return { branch, directory: undefined }
    const { root, segments, windows } = parsed
    let directory = entry(root, root, windows)
    for (const segment of segments) {
      if (segment === '') continue
      const prefix = directory.path.endsWith('/') ? directory.path : `${directory.path}/`
      directory = entry(`${prefix}${segment}`, segment, windows, directory)
    }
    // The first registered workspace at a path owns any descendants. Other IDs stay visible as peers.
    directory.branch ??= branch
    return { branch, directory }
  })

  const roots: Branch[] = []
  const attached = new Set<Branch>()
  function attach(branch: Branch, directory: PathEntry | undefined): void {
    if (attached.has(branch)) return
    attached.add(branch)
    for (let parent = directory?.parent; parent !== undefined; parent = parent.parent) {
      if (parent.branch === undefined && parent.key !== '/' && parent.childCount > 1) {
        parent.branch = {
          kind: 'directory', key: `directory:${parent.key}`, title: parent.title, path: parent.path, children: [],
        }
      }
      if (parent.branch !== undefined) {
        attach(parent.branch, parent)
        parent.branch.children.push(branch)
        return
      }
    }
    roots.push(branch)
  }

  for (const { branch, directory } of workspacesWithPaths) attach(branch, directory)
  return roots
}
