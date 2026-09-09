import { useEffect, useState, type FormEvent } from 'react'
import { Field } from '../components/Field'
import { useLedger } from '../hooks/useLedger'
import { monthlyAmortization, purchaseTotal } from '../lib/calc'
import { money, parseNumber } from '../lib/format'
import { uid } from '../lib/ids'
import type { PurchaseItem, Vehicle } from '../types'

export function PurchasePage() {
  const { vehicle, ready, error, updateVehicle } = useLedger()
  const [draft, setDraft] = useState<Vehicle | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (vehicle) setDraft(vehicle)
  }, [vehicle])

  if (error) return <p className="alert">{error}</p>
  if (!ready || !draft) return <p className="fine">讀取購置資料…</p>

  const total = purchaseTotal(draft)
  const amort = monthlyAmortization(draft)

  function updateItem(id: string, patch: Partial<PurchaseItem>) {
    setDraft((current) => {
      if (!current) return current
      return {
        ...current,
        purchaseItems: current.purchaseItems.map((item) =>
          item.id === id ? { ...item, ...patch } : item,
        ),
      }
    })
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!draft) return
    const years = Number(draft.ownershipYears)
    if (!years || years <= 0) {
      setMessage('持有年數要大於 0，攤提才算得出來')
      return
    }
    await updateVehicle({
      ...draft,
      ownershipYears: years,
      residualValue: Number(draft.residualValue) || 0,
      startOdometer: Number(draft.startOdometer) || 0,
      electricityRateHome: Number(draft.electricityRateHome) || 0,
    })
    setMessage('已寫入購置資料')
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <section className="page-lead">
        <p className="eyebrow">購置</p>
        <h2>買進這台車花了什麼</h2>
        <p className="lede">車價、配件、裝家充都列進來。系統會依持有年數與殘值，攤成每個月的持有成本。</p>
      </section>

      <section className="panel form">
        <div className="form-grid">
          <Field label="暱稱">
            <input
              value={draft.nickname}
              onChange={(event) => setDraft({ ...draft, nickname: event.target.value })}
            />
          </Field>
          <Field label="車型">
            <input
              value={draft.model}
              onChange={(event) => setDraft({ ...draft, model: event.target.value })}
              placeholder="例如 Model Y 後驅"
            />
          </Field>
          <Field label="購車日">
            <input
              type="date"
              value={draft.purchaseDate}
              onChange={(event) => setDraft({ ...draft, purchaseDate: event.target.value })}
            />
          </Field>
          <Field label="預計持有年數">
            <input
              inputMode="numeric"
              value={String(draft.ownershipYears)}
              onChange={(event) =>
                setDraft({ ...draft, ownershipYears: Number(event.target.value) || 0 })
              }
            />
          </Field>
          <Field label="預估殘值 NT$">
            <input
              inputMode="numeric"
              value={String(draft.residualValue || '')}
              onChange={(event) =>
                setDraft({ ...draft, residualValue: Number(event.target.value) || 0 })
              }
            />
          </Field>
          <Field label="購車時里程 km">
            <input
              inputMode="numeric"
              value={String(draft.startOdometer || '')}
              onChange={(event) =>
                setDraft({ ...draft, startOdometer: Number(event.target.value) || 0 })
              }
            />
          </Field>
          <Field label="家充電價 元/度" hint="家充只填度數時，會用這個算出金額">
            <input
              inputMode="decimal"
              value={String(draft.electricityRateHome || '')}
              onChange={(event) =>
                setDraft({ ...draft, electricityRateHome: Number(event.target.value) || 0 })
              }
            />
          </Field>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h3>購置明細</h3>
          <button
            type="button"
            className="btn ghost"
            onClick={() =>
              setDraft({
                ...draft,
                purchaseItems: [...draft.purchaseItems, { id: uid(), name: '', amount: 0 }],
              })
            }
          >
            加一項
          </button>
        </div>
        <ul className="item-list">
          {draft.purchaseItems.map((item) => (
            <li key={item.id}>
              <input
                value={item.name}
                placeholder="車價、配件、規費、家充…"
                onChange={(event) => updateItem(item.id, { name: event.target.value })}
              />
              <input
                inputMode="numeric"
                value={item.amount ? String(item.amount) : ''}
                placeholder="金額"
                onChange={(event) =>
                  updateItem(item.id, { amount: parseNumber(event.target.value) ?? 0 })
                }
              />
              <button
                type="button"
                className="btn tiny"
                onClick={() =>
                  setDraft({
                    ...draft,
                    purchaseItems: draft.purchaseItems.filter((row) => row.id !== item.id),
                  })
                }
                disabled={draft.purchaseItems.length <= 1}
              >
                刪
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="split-stats">
        <article className="stat">
          <p className="stat-label">購置合計</p>
          <p className="stat-value">{money(total)}</p>
        </article>
        <article className="stat">
          <p className="stat-label">每月攤提</p>
          <p className="stat-value">{money(amort)}</p>
        </article>
      </section>

      {message ? <p className="fine">{message}</p> : null}
      <div className="actions">
        <button type="submit" className="btn primary">
          儲存購置資料
        </button>
      </div>
    </form>
  )
}
