/**
 * Browser half of `dsh-workspace-file-tree`.
 *
 * Workspace File Tree — replace this paragraph with what the module changes,
 * and why it needs the DSH seam it uses.
 *
 * The module loader registers a lazy factory whose id is the package name.
 * `inject` names the Cordis services the module needs; `apply` runs once they
 * exist. Register every resource through `ctx.effect` / `ctx.on` and return its
 * cleanup, so disabling the bundle in Plugins removes it again.
 *
 * TODO(scaffold): describe the DSH-internal shape this module relies on, and why
 * no public API covers the change. Every access must be fail-safe: when a shape
 * is missing, leave DSH as shipped and warn once instead of throwing.
 */
window.__ModuleLoader__.load({
  id: 'dsh-workspace-file-tree',
  factory() {
    const NS = 'dsh-workspace-file-tree'
    /** Visible text this module renders itself; plugin-meta text lives in locale/*.json. */
    const LABELS = {
      en: { summary: "Workspace File Tree" },
      zh: { summary: "Workspace File Tree" },
      ja: { summary: "Workspace File Tree" },
      de: { summary: "Workspace File Tree" },
      es: { summary: "Workspace File Tree" },
      fr: { summary: "Workspace File Tree" },
      pt: { summary: "Workspace File Tree" },
      ru: { summary: "Workspace File Tree" },
    }

    return {
      inject: ['locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, LABELS), `${NS}: locale`)

        // TODO(scaffold): register the behavior inside ctx.effect / ctx.on.
      },
    }
  },
})
