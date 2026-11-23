import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Context } from '@deepseek-ai/cordis'

let registration
const oldWindow = globalThis.window
try {
  globalThis.window = { __ModuleLoader__: { load(entry) { registration = entry } } }
  await import('../client.js')
} finally {
  if (oldWindow === undefined) delete globalThis.window
  else globalThis.window = oldWindow
}
assert.equal(registration.id, '@miorin/dsh-workspace-file-tree')
const plugin = registration.factory((name) => {
  assert.fail(`Unexpected Client runtime import: ${name}`)
})

function fixture() {
  let language = 'en'
  const dictionaries = new Map()
  const groupings = new Map()
  const locale = {
    register(namespace, labels) {
      dictionaries.set(namespace, labels)
      return () => dictionaries.delete(namespace)
    },
    bind(namespace) {
      return key => dictionaries.get(namespace)?.[language]?.[key]
    },
  }
  const workspaceSwitcherGrouping = {
    register(grouping) {
      assert.ok(!groupings.has(grouping.id))
      groupings.set(grouping.id, grouping)
      return () => groupings.delete(grouping.id)
    },
  }
  return { locale, workspaceSwitcherGrouping, dictionaries, groupings, setLanguage: value => { language = value } }
}

test('waits for the optional service, handles localization, and unloads and re-registers cleanly', async () => {
  const host = new Context()
  const { locale, workspaceSwitcherGrouping, dictionaries, groupings, setLanguage } = fixture()
  const disposeLocale = host.provide('locale', locale)
  const fiber = await host.plugin(plugin)
  try {
    assert.equal(groupings.size, 0)
    assert.equal(dictionaries.size, 0)

    const dispose = host.provide('workspaceSwitcherGrouping', workspaceSwitcherGrouping)
    await new Promise(setImmediate)
    const grouping = groupings.get('workspace-file-tree')
    assert.ok(grouping)
    assert.equal(grouping.label(), 'Directory tree')
    assert.equal(Object.keys(dictionaries.get('dsh-workspace-file-tree')).length, 8)
    setLanguage('zh')
    assert.equal(grouping.label(), '按文件目录')

    await dispose()
    assert.equal(groupings.size, 0)
    assert.equal(dictionaries.size, 0)
    const disposeReplacement = host.provide('workspaceSwitcherGrouping', workspaceSwitcherGrouping)
    await new Promise(setImmediate)
    assert.deepEqual([...groupings.keys()], ['workspace-file-tree'])
    await fiber.dispose()
    assert.equal(groupings.size, 0)
    assert.equal(dictionaries.size, 0)
    await disposeReplacement()
  } finally {
    await disposeLocale()
  }
})

test('registers when the provider loads first and replaces a reloaded client without duplicates', async () => {
  const host = new Context()
  const { locale, workspaceSwitcherGrouping, groupings } = fixture()
  const disposeLocale = host.provide('locale', locale)
  const disposeGrouping = host.provide('workspaceSwitcherGrouping', workspaceSwitcherGrouping)
  try {
    const first = await host.plugin(plugin)
    await new Promise(setImmediate)
    const firstRegistration = groupings.get('workspace-file-tree')
    assert.ok(firstRegistration)
    await first.dispose()
    assert.equal(groupings.size, 0)

    const replacement = await host.plugin(registration.factory())
    try {
      await new Promise(setImmediate)
      assert.deepEqual([...groupings.keys()], ['workspace-file-tree'])
      assert.notEqual(groupings.get('workspace-file-tree'), firstRegistration)
    } finally {
      await replacement.dispose()
    }
  } finally {
    await disposeGrouping()
    await disposeLocale()
  }
})

const { project } = (() => {
  const { groupings, locale, workspaceSwitcherGrouping } = fixture()
  const context = {
    effect: install => install(),
    inject(names, callback) {
      assert.deepEqual(names, ['workspaceSwitcherGrouping'])
      callback(context)
    },
    locale,
    workspaceSwitcherGrouping,
  }
  plugin.apply(context)
  return groupings.get('workspace-file-tree')
})()

const workspace = (workspaceId, children = []) => ({ kind: 'workspace', workspaceId, children })
const directory = (path, title, children, keyPath = path) => ({
  kind: 'directory', key: `directory:${keyPath}`, title, path, children,
})

function assertProjection(paths, expected) {
  const inputs = Object.freeze(Object.entries(paths).map(([workspaceId, path]) => Object.freeze({ workspaceId, path })))
  const actual = project(inputs)
  assert.deepEqual(actual, expected)
  function collect(nodes) {
    return nodes.flatMap(node => {
      const descendants = collect(node.children ?? [])
      return node.kind === 'workspace' ? [node.workspaceId, ...descendants] : descendants
    })
  }
  assert.deepEqual(collect(actual).sort(), Object.keys(paths).sort())
}

test('preserves registered ancestry, folds unary ancestors, and keeps sibling order', () => {
  assertProjection({
    web: '/dev/team/apps/frontend/web/',
    separate: '/other/web',
    api: '/dev/team/apps/backend/api',
    team: '/dev/team',
    tools: '/dev/team/tools',
  }, [
    workspace('team', [directory('/dev/team/apps', 'apps', [workspace('web'), workspace('api')]), workspace('tools')]),
    workspace('separate'),
  ])
})

test('preserves an explicit Unix root, keeps pathless workspaces flat and compares Unix segments literally', () => {
  assertProjection({
    a: '/Work//child', b: '/Work/other', c: '/work/other',
    escape: String.raw`/Work\other/child`, root: '/', blank: '', relative: 'Work/child',
  }, [
    workspace('root', [directory('/Work', 'Work', [workspace('a'), workspace('b')]), workspace('c'), workspace('escape')]),
    workspace('blank'), workspace('relative'),
  ])
  assertProjection({ x: '/x/a', y: '/y/b' }, [workspace('x'), workspace('y')])
  assertProjection({}, [])
})

test('normalizes Windows drive paths and isolates different drives and Unix roots', () => {
  assertProjection({
    api: 'c:\\Projects\\api\\',
    web: 'C:/PROJECTS/web',
    logs: 'C:/logs',
    other: 'D:/Projects/web',
    unix: '/C:/Projects/web',
  }, [
    directory('C:/', 'C:/', [
      directory('C:/Projects', 'Projects', [workspace('api'), workspace('web')], 'c:/projects'), workspace('logs'),
    ], 'c:/'),
    workspace('other'), workspace('unix'),
  ])
  assertProjection({ child: 'z:/stuff', root: 'Z:/' }, [workspace('root', [workspace('child')])])
})

test('uses the server and share together as the UNC root', () => {
  assertProjection({
    a: String.raw`\\BuildHost\Work\alpha`,
    b: '//buildhost/work/beta',
    c: '//buildhost/private/alpha',
    d: '//otherhost/work/alpha',
    e: '//OTHERHOST/WORK/beta',
  }, [
    directory('//BuildHost/Work', '//BuildHost/Work', [workspace('a'), workspace('b')], '//buildhost/work'),
    workspace('c'),
    directory('//otherhost/work', '//otherhost/work', [workspace('d'), workspace('e')]),
  ])
  assertProjection({ child: '//BUILDHOST/wOrK/a', share: '//buildhost/Work/' }, [workspace('share', [workspace('child')])])
})

test('preserves each registered ID even when normalized paths coincide', () => {
  assertProjection({ later: '/team/tools/child', canonical: '/team/tools', alias: '/team//tools/' }, [
    workspace('canonical', [workspace('later')]),
    workspace('alias'),
  ])
})

test('directory keys stay stable across reorderings and normalized Windows path spellings', () => {
  const paths = [
    { workspaceId: 'a', path: String.raw`c:\TEAM\alpha` },
    { workspaceId: 'b', path: 'C:/Team/beta' },
  ]
  assert.equal(project(paths)[0].key, 'directory:c:/team')
  assert.equal(project(paths.toReversed())[0].key, 'directory:c:/team')
})
