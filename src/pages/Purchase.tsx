import { useEffect, useState, type FormEvent } from 'react'
import { Field } from '../components/Field'
import { useLedger } from '../hooks/useLedger'
import { monthlyAmortization, loanPlan, purchaseTotal } from '../lib/calc'
import { money, parseNumber } from '../lib/format'
import { uid } from '../lib/ids'
import { EFFICIENCY_BASELINE, type PurchaseItem, type Vehicle } from '../types'

export function PurchasePage() {
  const { vehicle, expenses, ready, error, updateVehicle } = useLedger()
  const [draft, setDraft] = useState<Vehicle | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (vehicle) setDraft(vehicle)
  }, [vehicle])

  if (error) return <p className="alert">{error}</p>
  if (!ready || !draft) return <p className="fine">讀取購置資料…</p>

  const total = purchaseTotal(draft)
  const amort = monthlyAmortization(draft)
  const loanReady =
    draft.loanAmount > 0 && draft.loanMonths > 0 && draft.loanPayment > 0 && Boolean(draft.loanStartDate)
  const plan = loanReady
    ? loanPlan(draft.loanAmount, Math.round(draft.loanMonths), draft.loanPayment, draft.loanStartDate)
    : null
  const today = new Date()
  const currentInstallment = plan?.rows.find(
    (row) => row.year === today.getFullYear() && row.month === today.getMonth(),
  )
  const manualLoan = expenses.some((expense) => expense.category === 'loan')

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
      model: draft.model || EFFICIENCY_BASELINE.model,
      ownershipYears: years,
      residualValue: Number(draft.residualValue) || 0,
      startOdometer: Number(draft.startOdometer) || 0,
      electricityRateHome: Number(draft.electricityRateHome) || 0,
      loanAmount: Number(draft.loanAmount) || 0,
      loanMonths: Math.round(Number(draft.loanMonths) || 0),
      loanPayment: Number(draft.loanPayment) || 0,
      loanStartDate: draft.loanStartDate || '',
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
            <select
              value={draft.model || EFFICIENCY_BASELINE.model}
              onChange={(event) => setDraft({ ...draft, model: event.target.value })}
            >
              {draft.model && draft.model !== EFFICIENCY_BASELINE.model ? (
                <option value={draft.model}>{draft.model}</option>
              ) : null}
              <option value={EFFICIENCY_BASELINE.model}>{EFFICIENCY_BASELINE.model}</option>
            </select>
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

      <section className="panel">
        <div className="panel-head">
          <h3>貸款本利試算</h3>
        </div>
        <p className="lede">
          填借款金額、期數和每月本利。系統反推利率，拆出每一期的利息和還本。利息會計入持有成本，還本已在車價攤提裡。
        </p>
        <div className="form-grid">
          <Field label="借款金額 NT$">
            <input
              inputMode="numeric"
              value={draft.loanAmount ? String(draft.loanAmount) : ''}
              onChange={(event) =>
                setDraft({ ...draft, loanAmount: parseNumber(event.target.value) ?? 0 })
              }
            />
          </Field>
          <Field label="期數（月）">
            <input
              inputMode="numeric"
              value={draft.loanMonths ? String(draft.loanMonths) : ''}
              onChange={(event) =>
                setDraft({ ...draft, loanMonths: Math.round(parseNumber(event.target.value) ?? 0) })
              }
            />
          </Field>
          <Field label="每月本利 NT$">
            <input
              inputMode="decimal"
              value={draft.loanPayment ? String(draft.loanPayment) : ''}
              onChange={(event) =>
                setDraft({ ...draft, loanPayment: parseNumber(event.target.value) ?? 0 })
              }
            />
          </Field>
          <Field label="撥款日">
            <input
              type="date"
              value={draft.loanStartDate}
              onChange={(event) => setDraft({ ...draft, loanStartDate: event.target.value })}
            />
          </Field>
        </div>
        {manualLoan ? (
          <p className="fine">其他費用裡還有一筆「貸款」。整筆月付不要留在那裡，否則利息會再算一次。</p>
        ) : null}
        {loanReady && !plan ? (
          <p className="alert">
            每月本利太低。以這個借款金額，至少要 {Math.ceil(draft.loanAmount / draft.loanPayment)}{' '}
            期才還得完本金。請對一下契約上的期數和月付金。
          </p>
        ) : null}
        {plan ? (
          <>
            <div className="split-stats report-stats">
              <article className="stat">
                <p className="stat-label">年利率</p>
                <p className="stat-value">{(plan.annualRate * 100).toFixed(2)}%</p>
                <p className="stat-hint">由月付金反推</p>
              </article>
              <article className="stat">
                <p className="stat-label">本月利息</p>
                <p className="stat-value">{currentInstallment ? money(currentInstallment.interest) : '—'}</p>
                <p className="stat-hint">計入持有成本</p>
              </article>
              <article className="stat">
                <p className="stat-label">本月還本</p>
                <p className="stat-value">{currentInstallment ? money(currentInstallment.principal) : '—'}</p>
                <p className="stat-hint">已含在車價攤提</p>
              </article>
              <article className="stat">
                <p className="stat-label">全期利息</p>
                <p className="stat-value">{money(plan.totalInterest)}</p>
                <p className="stat-hint">{plan.rows.length} 期合計</p>
              </article>
            </div>
            <div className="loan-scroll">
              <table className="loan-table">
                <thead>
                  <tr>
                    <th>期數</th>
                    <th>月份</th>
                    <th>利息</th>
                    <th>還本</th>
                    <th>剩餘本金</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.rows.map((row) => (
                    <tr
                      key={row.index}
                      className={
                        row.year === today.getFullYear() && row.month === today.getMonth() ? 'is-now' : undefined
                      }
                    >
                      <td>{row.index + 1}</td>
                      <td>
                        {row.year}/{String(row.month + 1).padStart(2, '0')}
                      </td>
                      <td>{money(row.interest)}</td>
                      <td>{money(row.principal)}</td>
                      <td>{money(row.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
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
