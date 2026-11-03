import { useState, type FormEvent } from 'react'
import { Field } from '../components/Field'
import { useLedger } from '../hooks/useLedger'
import { categoryLabel, money, parseNumber, recurrenceLabel } from '../lib/format'
import { todayISO, uid } from '../lib/ids'
import { EXPENSE_GROUPS, type ExpenseCategory, type FixedExpense, type Recurrence } from '../types'

interface ExpenseDraft {
  name: string
  category: ExpenseCategory
  amount: string
  recurrence: Recurrence
  startDate: string
  endDate: string
}

function emptyExpense(): ExpenseDraft {
  return {
    name: '',
    category: 'insurance',
    amount: '',
    recurrence: 'monthly',
    startDate: todayISO(),
    endDate: '',
  }
}

export function FixedExpensesPage() {
  const { expenses, ready, error, upsertExpense, removeExpense } = useLedger()
  const [draft, setDraft] = useState<ExpenseDraft>(emptyExpense())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  if (error) return <p className="alert">{error}</p>
  if (!ready) return <p className="fine">讀取固定支出…</p>

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const amount = parseNumber(draft.amount)
    if (!draft.name.trim() || amount == null) {
      setMessage('請填名稱與金額')
      return
    }
    await upsertExpense({
      id: editingId ?? uid(),
      name: draft.name.trim(),
      category: draft.category,
      amount,
      recurrence: draft.recurrence,
      startDate: draft.startDate,
      endDate: draft.endDate || undefined,
    })
    setDraft(emptyExpense())
    setEditingId(null)
    setMessage('已記入固定支出')
  }

  function startEdit(expense: FixedExpense) {
    setEditingId(expense.id)
    setDraft({
      name: expense.name,
      category: expense.category,
      amount: String(expense.amount),
      recurrence: expense.recurrence,
      startDate: expense.startDate,
      endDate: expense.endDate ?? '',
    })
  }

  return (
    <div className="stack">
      <section className="page-lead">
        <p className="eyebrow">其他</p>
        <h2>每個月都會出現的錢</h2>
        <p className="lede">
          固定持有放保險、貸款以外的訂閱與驗車。貸款利息由購置頁的本利試算自動計入，這裡不要再填整筆月付金。日常用車放停車、eTag、洗車、耗材、保養。
        </p>
      </section>

      <form className="panel form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <Field label="名稱">
            <input
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              placeholder="強制險、月租停車…"
            />
          </Field>
          <div className="category-board">
            <p className="field-label">類別</p>
            {EXPENSE_GROUPS.map((group) => (
              <div key={group.id}>
                <p className="category-group">{group.label}</p>
                <div className="period-switch" role="group" aria-label={group.label}>
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={draft.category === item.id ? 'chip is-on' : 'chip'}
                      aria-pressed={draft.category === item.id}
                      onClick={() => setDraft({ ...draft, category: item.id })}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <Field label="金額 NT$">
            <input
              inputMode="decimal"
              value={draft.amount}
              onChange={(event) => setDraft({ ...draft, amount: event.target.value })}
            />
          </Field>
          <Field label="週期">
            <select
              value={draft.recurrence}
              onChange={(event) =>
                setDraft({ ...draft, recurrence: event.target.value as Recurrence })
              }
            >
              <option value="monthly">每月</option>
              <option value="yearly">每年</option>
              <option value="one-off">一次</option>
            </select>
          </Field>
          <Field label="開始日">
            <input
              type="date"
              value={draft.startDate}
              onChange={(event) => setDraft({ ...draft, startDate: event.target.value })}
            />
          </Field>
          <Field label="結束日" hint="留空代表還在繳">
            <input
              type="date"
              value={draft.endDate}
              onChange={(event) => setDraft({ ...draft, endDate: event.target.value })}
            />
          </Field>
        </div>
        {message ? <p className="fine">{message}</p> : null}
        <div className="actions">
          {editingId ? (
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setEditingId(null)
                setDraft(emptyExpense())
              }}
            >
              取消編輯
            </button>
          ) : null}
          <button type="submit" className="btn primary">
            {editingId ? '更新這筆' : '加入固定支出'}
          </button>
        </div>
      </form>

      {expenses.length === 0 ? (
        <p className="empty">還沒有固定支出。保險或停車先記一筆，總覽的每月成本才完整。</p>
      ) : (
        <ul className="card-list">
          {expenses.map((expense) => (
            <li key={expense.id} className="panel row-card">
              <div>
                <p className="row-title">{expense.name}</p>
                <p className="row-meta">
                  {categoryLabel(expense.category)} · {recurrenceLabel(expense.recurrence)}
                  {expense.endDate ? ` · 至 ${expense.endDate}` : ''}
                </p>
              </div>
              <div className="row-end">
                <p>{money(expense.amount)}</p>
                <div className="mini-actions">
                  <button type="button" className="btn tiny" onClick={() => startEdit(expense)}>
                    改
                  </button>
                  <button
                    type="button"
                    className="btn tiny"
                    onClick={() => void removeExpense(expense.id)}
                  >
                    刪
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
