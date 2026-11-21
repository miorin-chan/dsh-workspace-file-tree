import assert from 'node:assert/strict'
import { test } from 'node:test'

/** Capture the module registration the browser module loader would receive. */
let registration
globalThis.window = {
  __ModuleLoader__: {
    load(entry) {
      registration = entry
    },
  },
}
await import('../client.js')

assert.equal(registration.id, 'dsh-workspace-file-tree')
const plugin = registration.factory()

/** A minimal host: recorded effects and a locale service with a real dispose. */
function fakeContext() {
  const effects = []
  const registered = new Map()
  const ctx = {
    effect(install, label) {
      const dispose = install()
      effects.push({ label, dispose })
      return dispose
    },
    locale: {
      register(namespace, labels) {
        registered.set(namespace, labels)
        return () => {
          registered.delete(namespace)
        }
      },
    },
  }
  return { ctx, effects, registered }
}

test('declares the services it injects', () => {
  assert.ok(Array.isArray(plugin.inject), 'inject must be an array')
  assert.ok(plugin.inject.includes('locale'), 'the skeleton registers locale labels')
})

test('registers its labels and releases them on unload', () => {
  const { ctx, effects, registered } = fakeContext()
  plugin.apply(ctx)

  assert.equal(effects.length, 1, 'apply registers exactly one effect to start')
  assert.ok(registered.has('dsh-workspace-file-tree'), 'locale labels are registered under the plugin id')
  assert.equal(Object.keys(registered.get('dsh-workspace-file-tree')).length, 8, 'every locale has labels')

  for (const effect of effects) effect.dispose()
  assert.equal(registered.has('dsh-workspace-file-tree'), false, 'disposing removes the locale namespace')
})
