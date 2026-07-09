import type { AnalyzeOptions } from '../engine/engine'

export function SettingsPanel({
  settings,
  onChange,
}: {
  settings: AnalyzeOptions
  onChange: (patch: Partial<AnalyzeOptions>) => void
}) {
  return (
    <section className="settings">
      <label htmlFor="depth">Depth: {settings.depth}</label>
      <input
        id="depth"
        type="range"
        min={1}
        max={30}
        value={settings.depth}
        onChange={(event) => onChange({ depth: Number(event.target.value) })}
      />

      <label htmlFor="multipv">Variations: {settings.multiPV}</label>
      <input
        id="multipv"
        type="range"
        min={1}
        max={5}
        value={settings.multiPV}
        onChange={(event) => onChange({ multiPV: Number(event.target.value) })}
      />
    </section>
  )
}
