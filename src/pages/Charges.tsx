import { useMemo, useState } from 'react'
import { ChargeForm, emptyDraft } from '../components/ChargeForm'
import { ChargeTrendDialog } from '../components/ChargeTrendDialog'
import { useLedger } from '../hooks/useLedger'
import { chargeLegs, evoasisRateMatch } from '../lib/calc'
import { formatDateTime, kwh, money, providerLabel, toDateTimeLocal, twd } from '../lib/format'
import { normalizeProvider, type ChargeDraft, type ChargeSession } from '../types'

function rateMark(charge: ChargeSession): { text: string; review: boolean } | null {
  const match = evoasisRateMatch(charge)
  if (!match) return null
  if (match.needsReview) return { text: '待確認', review: true }
  return { text: match.label, review: false }
}

export function ChargesPage() {
  const { vehicle, charges, ready, error, upsertCharge, removeCharge } = useLedger()
  const [mode, setMode] = useState<'idle' | 'manual' | 'edit'>('idle')
  const [chartOpen, setChartOpen] = useState(false)
  const [draft, setDraft] = useState<ChargeDraft>(emptyDraft())
  const [editing, setEditing] = useState<ChargeSession | null>(null)

  const legs = useMemo(() => chargeLegs(charges), [charges])
  const editingLeg = editing ? legs.get(editing.id) : undefined

  if (error) return <p className="alert">{error}</p>
  if (!ready || !vehicle) return <p className="fine">讀取充電紀錄…</p>

  function openManual() {
    setEditing(null)
    setDraft(emptyDraft())
    setMode('manual')
  }

  function openEdit(charge: ChargeSession) {
    setChartOpen(false)
    setEditing(charge)
    setDraft({
      chargedAt: toDateTimeLocal(charge.chargedAt),
      provider: normalizeProvider(charge.provider),
      location: charge.location,
      kWh: String(charge.kWh),
      costTwd: String(charge.costTwd),
      odometerKm: charge.odometerKm != null ? String(charge.odometerKm) : '',
      source: charge.source,
    })
    setMode('edit')
  }

  return (
    <div className="stack">
      <section className="page-lead">
        <p className="eyebrow">充電</p>
        <h2>每一次補能</h2>
      </section>

        <div className={mode === 'idle' ? 'actions dock-actions' : 'actions'}>
        <button type="button" className="btn primary" onClick={openManual}>
          手打一筆
        </button>
        <button type="button" className="btn ghost" onClick={() => setChartOpen(true)} disabled={charges.length === 0}>
          統計圖
        </button>
      </div>

      {mode !== 'idle' ? (
        <ChargeForm
          vehicle={vehicle}
          initial={draft}
          editing={editing}
          onCancel={() => {
            setMode('idle')
            setEditing(null)
          }}
          onDelete={
            editing
              ? async () => {
                  await removeCharge(editing.id)
                  setMode('idle')
                  setEditing(null)
                }
              : undefined
          }
          onSave={async (charge) => {
            await upsertCharge(charge)
            setMode('idle')
            setEditing(null)
          }}
        />
      ) : null}

      {mode === 'edit' && editingLeg ? (
        <p className="fine">
          這趟 {twd(editingLeg.km)} km · {money(editingLeg.perKm, 2)}/km
        </p>
      ) : null}

      {charges.length === 0 ? (
        <p className="empty">還沒有充電紀錄。先手打度數、金額和里程。</p>
      ) : (
        <ul className="timeline charge-list">
          {charges.map((charge) => {
            const mark = rateMark(charge)
            return (
              <li key={charge.id}>
                <button type="button" className="timeline-main" onClick={() => openEdit(charge)}>
                  <div>
                    <p className="row-title">
                      <span className="charge-when">{formatDateTime(charge.chargedAt)}</span>
                      {mark ? (
                        <span className={mark.review ? 'charge-mark is-review' : 'charge-mark'}>{mark.text}</span>
                      ) : null}
                    </p>
                    <p className="row-meta">
                      {providerLabel(charge.provider)}
                      {charge.location ? ` · ${charge.location}` : ''}
                    </p>
                  </div>
                  <div className="row-end">
                    <p>{money(charge.costTwd)}</p>
                    <p className="row-meta">{kwh(charge.kWh)}</p>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <ChargeTrendDialog
        open={chartOpen}
        charges={charges}
        legs={legs}
        onClose={() => setChartOpen(false)}
        onOpenCharge={openEdit}
      />
    </div>
  )
}
