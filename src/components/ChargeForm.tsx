import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Field } from './Field'
import { CHARGE_PROVIDERS, type ChargeDraft, type ChargeProvider, type ChargeSession, type Vehicle } from '../types'
import { fromDateTimeLocal, parseNumber } from '../lib/format'
import { homeChargeAmount } from '../lib/calc'
import { nowDateTimeLocal, uid } from '../lib/ids'

interface ChargeFormProps {
  vehicle: Vehicle
  initial?: ChargeDraft
  editing?: ChargeSession | null
  onCancel?: () => void
  onSave: (charge: ChargeSession) => Promise<void>
}

export function emptyDraft(): ChargeDraft {
  return {
    chargedAt: nowDateTimeLocal(),
    provider: 'home',
    location: '',
    kWh: '',
    costTwd: '',
    odometerKm: '',
    source: 'manual',
  }
}

export function ChargeForm({ vehicle, initial, editing, onCancel, onSave }: ChargeFormProps) {
  const [draft, setDraft] = useState<ChargeDraft>(initial ?? emptyDraft())
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (initial) setDraft(initial)
  }, [initial])

  const suggestedHome = useMemo(() => {
    const kWh = parseNumber(draft.kWh)
    if (draft.provider !== 'home' || kWh == null) return null
    return homeChargeAmount(kWh, vehicle.electricityRateHome)
  }, [draft.kWh, draft.provider, vehicle.electricityRateHome])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const kWh = parseNumber(draft.kWh)
    let cost = parseNumber(draft.costTwd)
    if (kWh == null || kWh < 0) {
      setMessage('請填充電度數')
      return
    }
    if ((cost == null || cost === 0) && suggestedHome != null) {
      cost = suggestedHome
    }
    if (cost == null) {
      setMessage('請填金額，或改選家充以帶入電價')
      return
    }
    const odometer = parseNumber(draft.odometerKm)
    setBusy(true)
    setMessage(null)
    try {
      await onSave({
        id: editing?.id ?? uid(),
        chargedAt: fromDateTimeLocal(draft.chargedAt),
        provider: draft.provider,
        location: draft.location.trim(),
        kWh,
        costTwd: cost,
        odometerKm: odometer ?? undefined,
        source: draft.source,
        photoBlob: draft.photoBlob ?? editing?.photoBlob,
        ocrRawText: draft.ocrRawText,
        createdAt: editing?.createdAt ?? new Date().toISOString(),
      })
      if (!editing) setDraft(emptyDraft())
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '儲存失敗')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="panel form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <Field label="時間">
          <input
            type="datetime-local"
            value={draft.chargedAt}
            onChange={(event) => setDraft({ ...draft, chargedAt: event.target.value })}
          />
        </Field>
        <Field label="來源">
          <select
            value={draft.provider}
            onChange={(event) =>
              setDraft({ ...draft, provider: event.target.value as ChargeProvider })
            }
          >
            {CHARGE_PROVIDERS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="地點">
          <input
            value={draft.location}
            onChange={(event) => setDraft({ ...draft, location: event.target.value })}
            placeholder="家裡、服務區、賣場…"
          />
        </Field>
        <Field label="度數 kWh">
          <input
            inputMode="decimal"
            value={draft.kWh}
            onChange={(event) => setDraft({ ...draft, kWh: event.target.value })}
          />
        </Field>
        <Field
          label="金額 NT$"
          hint={
            suggestedHome != null && !draft.costTwd
              ? `家充未填金額時，會用 ${vehicle.electricityRateHome} 元/度 帶成 ${suggestedHome}`
              : undefined
          }
        >
          <input
            inputMode="decimal"
            value={draft.costTwd}
            onChange={(event) => setDraft({ ...draft, costTwd: event.target.value })}
            placeholder={suggestedHome != null ? String(suggestedHome) : ''}
          />
        </Field>
        <Field label="里程表 km" hint="用來算每公里成本，能填就填">
          <input
            inputMode="numeric"
            value={draft.odometerKm}
            onChange={(event) => setDraft({ ...draft, odometerKm: event.target.value })}
          />
        </Field>
      </div>
      {draft.photoBlob ? (
        <p className="fine">已附充電單照片，會一併存下備查。</p>
      ) : null}
      {draft.ocrRawText ? (
        <details className="ocr-raw">
          <summary>辨識原文</summary>
          <pre>{draft.ocrRawText}</pre>
        </details>
      ) : null}
      {message ? <p className="alert">{message}</p> : null}
      <div className="actions">
        {onCancel ? (
          <button type="button" className="btn ghost" onClick={onCancel}>
            取消
          </button>
        ) : null}
        <button type="submit" className="btn primary" disabled={busy}>
          {busy ? '儲存中…' : editing ? '更新這筆' : '記入帳本'}
        </button>
      </div>
    </form>
  )
}
