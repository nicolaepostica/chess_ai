import type { AnalyzeOptions } from '../engine/engine'

const ROW = 'flex items-center gap-3.5'
const LABEL = 'w-30 shrink-0 text-[13px] text-fg-secondary'
const VALUE = 'w-6 shrink-0 text-right font-mono text-[13px] text-fg tabular-nums'
const RANGE = 'h-1 flex-1 cursor-pointer appearance-none rounded-sm bg-white/10 accent-accent'

export function SettingsPanel({
  settings,
  onChange,
}: {
  settings: AnalyzeOptions
  onChange: (patch: Partial<AnalyzeOptions>) => void
}) {
  return (
    <div className="settings flex flex-col gap-2.5">
      <div className={ROW}>
        <label htmlFor="depth" className={LABEL}>
          Target depth
        </label>
        <input
          id="depth"
          type="range"
          min={1}
          max={30}
          value={settings.depth}
          className={RANGE}
          onChange={(event) => onChange({ depth: Number(event.target.value) })}
        />
        <span className={VALUE}>{settings.depth}</span>
      </div>

      <div className={ROW}>
        <label htmlFor="multipv" className={LABEL}>
          Variations
        </label>
        <input
          id="multipv"
          type="range"
          min={1}
          max={5}
          value={settings.multiPV}
          className={RANGE}
          onChange={(event) => onChange({ multiPV: Number(event.target.value) })}
        />
        <span className={VALUE}>{settings.multiPV}</span>
      </div>
    </div>
  )
}
