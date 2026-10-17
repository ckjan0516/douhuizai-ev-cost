import { useMemo, useState } from 'react'
import { ChargeForm, emptyDraft } from '../components/ChargeForm'
import { ScanDialog } from '../components/ScanDialog'
import { useLedger } from '../hooks/useLedger'
import { chargeLegs } from '../lib/calc'
import { formatDateTime, kwh, money, providerLabel, toDateTimeLocal, twd } from '../lib/format'
import { normalizeProvider, type ChargeDraft, type ChargeSession } from '../types'

export function ChargesPage() {
  const { vehicle, charges, ready, error, upsertCharge, removeCharge } = useLedger()
  const [mode, setMode] = useState<'idle' | 'manual' | 'edit'>('idle')
  const [scanOpen, setScanOpen] = useState(false)
  const [draft, setDraft] = useState<ChargeDraft>(emptyDraft())
  const [editing, setEditing] = useState<ChargeSession | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const grouped = useMemo(() => charges, [charges])
  const legs = useMemo(() => chargeLegs(charges), [charges])

  if (error) return <p className="alert">{error}</p>
  if (!ready || !vehicle) return <p className="fine">讀取充電紀錄…</p>

  function openManual() {
    setEditing(null)
    setDraft(emptyDraft())
    setMode('manual')
  }

  function openEdit(charge: ChargeSession) {
    setEditing(charge)
    setDraft({
      chargedAt: toDateTimeLocal(charge.chargedAt),
      provider: normalizeProvider(charge.provider),
      location: charge.location,
      kWh: String(charge.kWh),
      costTwd: String(charge.costTwd),
      odometerKm: charge.odometerKm != null ? String(charge.odometerKm) : '',
      source: charge.source,
      photoBlob: charge.photoBlob,
      ocrRawText: charge.ocrRawText,
    })
    setMode('edit')
    if (charge.photoBlob) {
      setPreview(URL.createObjectURL(charge.photoBlob))
    } else if (charge.photoUrl) {
      setPreview(charge.photoUrl)
    } else {
      setPreview(null)
    }
  }

  return (
    <div className="stack">
      <section className="page-lead">
        <p className="eyebrow">充電</p>
        <h2>每一次補能</h2>
        <p className="lede">先手打一筆，記下度數、金額和里程。也可以掃描充電單，拍照或從相簿選截圖。</p>
      </section>

      <div className="actions">
        <button type="button" className="btn primary" onClick={openManual}>
          手打一筆
        </button>
        <button type="button" className="btn ghost" onClick={() => setScanOpen(true)}>
          掃描充電單
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
          onSave={async (charge) => {
            await upsertCharge(charge)
            setMode('idle')
            setEditing(null)
            setPreview(null)
          }}
        />
      ) : null}

      {preview && mode === 'edit' ? (
        <img className="receipt-preview" src={preview} alt="充電單" />
      ) : null}

      {grouped.length === 0 ? (
        <p className="empty">還沒有充電紀錄。先手打度數、金額和里程。</p>
      ) : (
        <ul className="timeline">
          {grouped.map((charge) => (
            <li key={charge.id}>
              <button type="button" className="timeline-main" onClick={() => openEdit(charge)}>
                <div>
                  <p className="row-title">{providerLabel(charge.provider)}</p>
                  <p className="row-meta">
                    {formatDateTime(charge.chargedAt)}
                    {charge.location ? ` · ${charge.location}` : ''}
                    {charge.odometerKm != null ? ` · ${charge.odometerKm} km` : ''}
                    {legs.get(charge.id)
                      ? ` · 這趟 ${twd(legs.get(charge.id)!.km)} km · ${money(legs.get(charge.id)!.perKm, 2)}/km`
                      : ''}
                    {charge.source === 'ocr' ? ' · 掃描' : ''}
                  </p>
                </div>
                <div className="row-end">
                  <p>{money(charge.costTwd)}</p>
                  <p className="row-meta">{kwh(charge.kWh)}</p>
                </div>
              </button>
              <button
                type="button"
                className="btn tiny"
                onClick={() => void removeCharge(charge.id)}
              >
                刪
              </button>
            </li>
          ))}
        </ul>
      )}

      <ScanDialog
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onDraft={(next) => {
          setEditing(null)
          setDraft(next)
          setMode('manual')
          if (next.photoBlob) setPreview(URL.createObjectURL(next.photoBlob))
        }}
      />
    </div>
  )
}
