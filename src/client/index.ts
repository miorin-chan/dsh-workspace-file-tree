/**
 * Registers a directory projection with the separate workspace switcher plugin.
 * With no workspaceSwitcherGrouping provider, the Client waits without changing the UI.
 */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { project } from './project'

const NS = 'dsh-workspace-file-tree'
const LABELS = {
  en: { label: 'Directory tree' },
  zh: { label: '按文件目录' },
  ja: { label: 'ディレクトリツリー' },
  de: { label: 'Verzeichnisbaum' },
  es: { label: 'Árbol de directorios' },
  fr: { label: 'Arborescence des dossiers' },
  pt: { label: 'Árvore de diretórios' },
  ru: { label: 'Дерево каталогов' },
}

// The switcher owns this contract. Keep the bundle independent of its package.
interface WorkspaceGroupingService {
  register(grouping: {
    id: 'workspace-file-tree'
    label: () => string
    project: typeof project
  }): () => void
}

export const inject = ['locale']

export function apply(ctx: Context): void {
  ctx.inject(['workspaceSwitcherGrouping'], (child) => {
    const { workspaceSwitcherGrouping } = child as Context & { workspaceSwitcherGrouping: WorkspaceGroupingService }
    child.effect(() => child.locale.register(NS, LABELS), `${NS}: locale`)
    const label = child.locale.bind(NS)
    child.effect(() => workspaceSwitcherGrouping.register({
      id: 'workspace-file-tree',
      label: () => label('label'),
      project,
    }), `${NS}: directory grouping`)
  })
}
