export function DepthBadge({ reached, target }: { reached: number; target: number }) {
  const shown = reached === 0 ? '—' : String(Math.min(reached, target))

  return (
    <span data-testid="depth-badge" className="font-mono text-[13px] text-fg-muted tabular-nums">
      depth <b className="font-semibold text-accent">{shown}</b>/{target}
    </span>
  )
}
