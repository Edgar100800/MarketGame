import { useState } from 'react'
import { useGame, world } from '../game/state'
import { buyUpgrade, togglePause, upgradeRows, type UpgradeRow, type UpgradeTab } from '../game/upgrades'
import { ProductIcon } from '../models/Icon2D'

const TABS: { id: UpgradeTab; label: string }[] = [
  { id: 'workers', label: 'Trabajadores' },
  { id: 'machines', label: 'Máquinas' },
  { id: 'animals', label: 'Animales' },
]

function Row({ row, money }: { row: UpgradeRow; money: number }) {
  return (
    <div className={row.id === 'player' ? 'up-row up-row-player' : 'up-row'}>
      <div className="up-items">
        {row.items.map((k) => (
          <ProductIcon key={k} kind={k} className="up-product-icon" />
        ))}
      </div>
      <div className="up-who">
        <ProductIcon kind={row.icon} className="up-who-icon" />
        <span className="up-who-name">{row.title}</span>
        {row.workerId && (
          <button className="up-pause" title={row.paused ? 'Reanudar' : 'Pausar'} onClick={() => togglePause(world, row.workerId!)}>
            {row.paused ? 'Seguir' : 'Pausar'}
          </button>
        )}
      </div>
      <div className="up-stats">
        {row.stats.map((s) => (
          <div key={s.key} className="up-stat">
            <span className="up-stat-label">
              {s.label} – Nv.{s.level + 1}
            </span>
            {s.cost === null ? (
              <button className="up-buy maxed" disabled>
                Máx
              </button>
            ) : (
              <button className="up-buy" disabled={money < s.cost} onClick={() => buyUpgrade(world, s.key)}>
                <ProductIcon kind="money" className="up-money-icon" /> {s.cost}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Upgrades modal (Workers / Machines / Animals), like the original game. */
export function UpgradesPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<UpgradeTab>('workers')
  const money = useGame((s) => s.money)
  useGame((s) => s.version) // re-render after purchases / pauses / new stations
  const rows = upgradeRows(world, tab)
  return (
    <div className="up-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="up-panel">
        <div className="up-title">MEJORAS</div>
        <button className="up-close" onClick={onClose}>
          ×
        </button>
        <div className="up-tabs">
          {TABS.map((t) => (
            <button key={t.id} className={`up-tab up-tab-${t.id} ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <div className={`up-list up-list-${tab}`}>
          {rows.length === 0 && <div className="up-empty">Aún no hay nada aquí. ¡Sigue desbloqueando!</div>}
          {rows.map((r) => (
            <Row key={r.id} row={r} money={money} />
          ))}
          {tab === 'workers' && world.workers.length === 0 && <div className="up-empty">Contrata empleados en las zonas de compra para verlos aquí.</div>}
        </div>
      </div>
    </div>
  )
}
