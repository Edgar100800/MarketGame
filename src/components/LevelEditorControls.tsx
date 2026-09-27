import { editedLevel, exportLevelLayout, stationDefs, stationRelations, TIER_COLORS, unlockTiers, useEditor } from '../game/editor'
import { NAME } from '../game/config'

function selectionDetails() {
  const selected = useEditor.getState().selected
  if (!selected) return null
  if (selected.type === 'zone') {
    const zone = editedLevel().unlocks.find((unlock) => unlock.id === selected.id)
    return zone ? { pos: zone.zone, turn: null } : null
  }
  if (selected.type === 'deco') {
    const piece = editedLevel().deco?.find((candidate) => candidate.id === selected.id)
    return piece ? { pos: piece.pos, turn: piece.turn ?? 0 } : null
  }
  if (selected.type === 'area') {
    const area = editedLevel().areas.find((candidate) => candidate.id === selected.id)
    return area ? { pos: { x: area.rect.x, z: area.rect.z }, turn: null, size: { w: area.rect.w, d: area.rect.d } } : null
  }
  if (selected.type === 'trash') {
    const bin = editedLevel().trash.find((candidate) => candidate.id === selected.id)
    return bin ? { pos: bin.pos, turn: null } : null
  }
  const station = stationDefs(editedLevel()).find((candidate) => candidate.id === selected.id)
  return station ? { pos: station.pos, turn: station.turn ?? 0 } : null
}

export function LevelEditorControls({ onExit }: { onExit: () => void }) {
  const selected = useEditor((state) => state.selected)
  const level = useEditor((state) => state.level)
  const gridVisible = useEditor((state) => state.gridVisible)
  const levelsVisible = useEditor((state) => state.levelsVisible)
  const tierFilter = useEditor((state) => state.tierFilter)
  const history = useEditor((state) => state.history)
  const select = useEditor((state) => state.select)
  const setTierFilter = useEditor((state) => state.setTierFilter)
  const details = selectionDetails()
  const tiers = unlockTiers(level)
  const tierGroups = Object.entries(
    Object.entries(tiers).reduce<Record<number, number>>((groups, [, tier]) => {
      groups[tier] = (groups[tier] ?? 0) + 1
      return groups
    }, {}),
  ).sort(([a], [b]) => Number(a) - Number(b))

  return (
    <aside className="level-editor-panel">
      <header>
        <div>
          <small>HERRAMIENTA DEV</small>
          <strong>Editor de nivel</strong>
        </div>
        <button className="editor-close" onClick={onExit} aria-label="Cerrar editor">
          ×
        </button>
      </header>

      <button className={`editor-levels-toggle${levelsVisible ? ' active' : ''}`} onClick={() => useEditor.getState().toggleLevels()}>
        {levelsVisible ? '🎨 Ocultar niveles de compra' : '🎨 Ver niveles de compra'}
      </button>

      {levelsVisible && (
        <div className="editor-relations tier-legend">
          <small>NIVELES DE COMPRA · click para aislar</small>
          <div className="tier-chip-row">
            {tierGroups.map(([tier, count]) => {
              const n = Number(tier)
              return (
                <button key={tier} className={`tier-chip-btn${tierFilter === n ? ' active' : ''}`} onClick={() => setTierFilter(n)}>
                  <span className="tier-chip" style={{ background: TIER_COLORS[(n - 1) % TIER_COLORS.length] }}>
                    N{n}
                  </span>
                  {count}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="editor-status">
        {selected ? (
          <>
            <span>
              {selected.type === 'station'
                ? 'Estación'
                : selected.type === 'deco'
                  ? 'Decoración'
                  : selected.type === 'area'
                    ? 'Área'
                    : selected.type === 'trash'
                      ? 'Tacho de basura'
                      : 'Zona de compra'}
            </span>
            <strong>{selected.id}</strong>
            {details && (
              <code>
                x {details.pos.x.toFixed(1)} · z {details.pos.z.toFixed(1)}
                {details.turn !== null ? ` · ${details.turn * 90}°` : ''}
                {details.size ? ` · ${details.size.w}×${details.size.d}` : ''}
              </code>
            )}
          </>
        ) : (
          <span>Selecciona y arrastra un objeto</span>
        )}
      </div>

      {selected?.type === 'area' && (() => {
        const area = level.areas.find((candidate) => candidate.id === selected.id)
        if (!area) return null
        const unlock = level.unlocks.find((candidate) => candidate.area === area.id)
        return (
          <div className="editor-relations">
            <small>PISE DEL ÁREA · {area.rect.w}×{area.rect.d}</small>
            <div className="editor-actions">
              <button onClick={() => useEditor.getState().resizeArea(area.id, 'w', -0.5)}>Ancho −</button>
              <button onClick={() => useEditor.getState().resizeArea(area.id, 'w', 0.5)}>Ancho +</button>
              <button onClick={() => useEditor.getState().resizeArea(area.id, 'd', -0.5)}>Fondo −</button>
              <button onClick={() => useEditor.getState().resizeArea(area.id, 'd', 0.5)}>Fondo +</button>
              <button onClick={() => useEditor.getState().rotate(1)}>↷ Girar (permutar)</button>
              {unlock && <button onClick={() => select({ type: 'zone', id: unlock.id })}>Zona: {unlock.label}</button>}
            </div>
          </div>
        )
      })()}

      {selected?.type === 'zone' && (() => {
        const unlock = level.unlocks.find((candidate) => candidate.id === selected.id)
        const area = unlock && level.areas.find((candidate) => candidate.id === unlock.area)
        if (!area) return null
        return (
          <div className="editor-relations">
            <small>EFECTO</small>
            <button onClick={() => select({ type: 'area', id: area.id })}>
              Abre el área {area.id} ({area.rect.w}×{area.rect.d})
            </button>
          </div>
        )
      })()}

      {selected?.type === 'station' && (() => {
        const { providers, zones, isStart } = stationRelations(level, selected.id)
        return (
          <div className="editor-relations">
            <small>RELACIONES</small>
            <div>
              <em>Compra</em>
              {isStart && <button onClick={() => select(null)}>Estación inicial (sin zona)</button>}
              {zones.map((zone) => {
                const tier = tiers[zone.id]
                const opened = level.unlocks.find((candidate) => candidate.id === zone.id)?.area
                return (
                  <button key={zone.id} onClick={() => select({ type: 'zone', id: zone.id })}>
                    {levelsVisible && tier && (
                      <span className="tier-chip mini" style={{ background: TIER_COLORS[(tier - 1) % TIER_COLORS.length] }}>
                        N{tier}
                      </span>
                    )}
                    {zone.label} · ${zone.price} · x {zone.zone.x.toFixed(1)} / z {zone.zone.z.toFixed(1)}
                    {opened && <small> · abre {opened}</small>}
                  </button>
                )
              })}
              {!isStart && !zones.length && <span>sin zona</span>}
            </div>
            <div>
              <em>Recibe de</em>
              {providers.map((provider) => (
                <button key={provider.id} onClick={() => select({ type: 'station', id: provider.id })}>
                  {provider.id} <small>({NAME[provider.kind]})</small>
                </button>
              ))}
              {!providers.length && <span>nadie: produce solo</span>}
            </div>
          </div>
        )
      })()}

      <div className="editor-actions">
        <button className={gridVisible ? 'active' : ''} onClick={() => useEditor.getState().toggleGrid()}>
          {gridVisible ? 'Ocultar grilla' : 'Ver grilla'}
        </button>
        <button disabled={selected?.type !== 'station' && selected?.type !== 'deco' && selected?.type !== 'area'} onClick={() => useEditor.getState().rotate(-1)}>↶ 90°</button>
        <button disabled={selected?.type !== 'station' && selected?.type !== 'deco' && selected?.type !== 'area'} onClick={() => useEditor.getState().rotate(1)}>↷ 90°</button>
        <button disabled={!history.length} onClick={() => useEditor.getState().undo()}>Deshacer</button>
        <button onClick={exportLevelLayout}>Exportar JSON</button>
        <button className="danger" onClick={() => useEditor.getState().reset()}>Restablecer</button>
      </div>

      <p>Arrastra sobre la grilla de 0.5. Los cambios se guardan automáticamente.</p>
    </aside>
  )
}
