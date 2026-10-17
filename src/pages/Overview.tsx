import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BreakdownDialog } from '../components/BreakdownDialog'
import {
  chargesInRange,
  chargingHabits,
  chargeLegs,
  averageUnitPrice,
  fixedBreakdown,
  monthsInRange,
  monthlyAmortization,
  monthlySeries,
  periodRange,
  providerShares,
  purchaseTotal,
  summarizePeriod,
} from '../lib/calc'
import {
  categoryLabel,
  formatDate,
  formatDateTime,
  kwh,
  money,
  providerLabel,
  recurrenceLabel,
  twd,
} from '../lib/format'
import { useLedger } from '../hooks/useLedger'
import { EFFICIENCY_BASELINE, type PeriodKey } from '../types'

const quickPeriods: Array<{ id: PeriodKey; label: string }> = [
  { id: 'month', label: '本月' },
  { id: 'all', label: '持有至今' },
]

const menuPeriods: Array<{ id: PeriodKey; label: string }> = [
  { id: 'lastMonth', label: '上月' },
  { id: 'quarter', label: '近三月' },
  { id: 'half', label: '近半年' },
  { id: 'year', label: '今年' },
  { id: 'custom', label: '輸入區間' },
]

const baselineWhPerKm = 1000 / EFFICIENCY_BASELINE.kmPerKwh

function efficiencyText(gap: number | null): string {
  if (gap == null) return ''
  const rounded = Math.round(gap)
  if (rounded === 0) return '與基準相同'
  if (rounded > 0) return `高於基準 ${rounded}%`
  return `低於基準 ${Math.abs(rounded)}%`
}

export function OverviewPage() {
  const { vehicle, expenses, charges, ready, error, migrated } = useLedger()
  const [period, setPeriod] = useState<PeriodKey>('month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [includePurchase, setIncludePurchase] = useState(false)
  const [detail, setDetail] = useState<'amort' | 'fixed' | 'charge' | null>(null)
  const customRange = { start: customStart, end: customEnd }

  const summary = useMemo(() => {
    if (!vehicle) return null
    return summarizePeriod(vehicle, expenses, charges, period, new Date(), customRange)
  }, [vehicle, expenses, charges, period, customStart, customEnd])

  const chart = useMemo(() => {
    if (!vehicle) return []
    return monthlySeries(vehicle, expenses, charges, 6)
  }, [vehicle, expenses, charges])

  const detailData = useMemo(() => {
    if (!vehicle) return null
    const range = periodRange(period, new Date(), vehicle.purchaseDate, customRange)
    const months = monthsInRange(range.start, range.end)
    return {
      months: months.length,
      monthlyAmort: monthlyAmortization(vehicle),
      purchaseSum: purchaseTotal(vehicle),
      fixedLines: fixedBreakdown(expenses, months),
      chargeLines: chargesInRange(charges, range),
    }
  }, [vehicle, expenses, charges, period, customStart, customEnd])

  if (error) return <p className="alert">{error}</p>
  if (!ready || !vehicle || !summary || !detailData) return <p className="fine">讀取行程電腦…</p>

  const recent = charges.slice(0, 4)
  const shownPerKm = includePurchase ? summary.perKmWithPurchase : summary.perKm
  const menuValue = period === 'month' || period === 'all' ? '' : period
  const efficiencyGap =
    summary.whPerKm == null ? null : ((summary.whPerKm - baselineWhPerKm) / baselineWhPerKm) * 100
  const unitPrice = averageUnitPrice(detailData.chargeLines)
  const kmPerKwh = summary.km != null && summary.kWh > 0 ? summary.km / summary.kWh : null
  const brands = providerShares(detailData.chargeLines)
  const habits = chargingHabits(detailData.chargeLines)
  const legs = chargeLegs(charges)
  const brandCost = brands.reduce((sum, row) => sum + row.cost, 0)
  const habitKwh = habits.bands.reduce((sum, row) => sum + row.kWh, 0)

  function choosePeriod(next: PeriodKey) {
    setPeriod(next)
    if (next !== 'custom') return
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    setCustomStart((current) => current || `${year}-${month}-01`)
    setCustomEnd((current) => current || `${year}-${month}-${day}`)
  }

  return (
    <div className="stack">
      {migrated ? (
        <p className="fine">已把這台瀏覽器裡的舊帳本搬到你的 Google 帳號。</p>
      ) : null}
      <section className="cluster">
        <div className="cluster-head">
          <div>
            <p className="eyebrow">{vehicle.model || EFFICIENCY_BASELINE.model}</p>
            <h2 className="display-name">{vehicle.nickname}</h2>
          </div>
          <div className="period-controls">
            <div className="period-switch" role="tablist" aria-label="統計期間">
              {quickPeriods.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={period === item.id}
                  className={period === item.id ? 'chip is-on' : 'chip'}
                  onClick={() => choosePeriod(item.id)}
                >
                  {item.label}
                </button>
              ))}
              <select
                className={menuValue ? 'period-select is-on' : 'period-select'}
                aria-label="其他統計區間"
                value={menuValue}
                onChange={(event) => {
                  const next = event.target.value as PeriodKey
                  if (next) choosePeriod(next)
                }}
              >
                <option value="">更多區間</option>
                {menuPeriods.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            {period === 'custom' ? (
              <div className="custom-range">
                <label>
                  起
                  <input
                    type="date"
                    value={customStart}
                    onChange={(event) => setCustomStart(event.target.value)}
                  />
                </label>
                <label>
                  迄
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(event) => setCustomEnd(event.target.value)}
                  />
                </label>
              </div>
            ) : null}
          </div>
        </div>

        <div className="odometer">
          <div className="odometer-head">
            <p className="odometer-label">每公里成本</p>
            <div className="period-switch" role="tablist" aria-label="每公里成本算法">
              <button
                type="button"
                role="tab"
                aria-selected={!includePurchase}
                className={includePurchase ? 'chip' : 'chip is-on'}
                onClick={() => setIncludePurchase(false)}
              >
                不含購車攤提
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={includePurchase}
                className={includePurchase ? 'chip is-on' : 'chip'}
                onClick={() => setIncludePurchase(true)}
              >
                含購車攤提
              </button>
            </div>
          </div>
          {shownPerKm == null ? (
            <p className="odometer-value is-empty">尚缺里程</p>
          ) : (
            <p className="odometer-value">
              <span className="currency">NT$</span>
              {twd(shownPerKm, 2)}
              <span className="unit">/ km</span>
            </p>
          )}
          <p className="odometer-sub">
            {summary.km == null
              ? '充電時記下里程表，就能換算每公里要多少。'
              : `這段期間走了 ${twd(summary.km)} 公里。`}
            {includePurchase
              ? ' 目前含購車每月攤提。'
              : ' 目前不含購車費用；貸款已算在固定支出。'}
          </p>
        </div>

        <div className="odometer">
          <div className="odometer-head">
            <p className="odometer-label">電耗</p>
            <p className="fine">{EFFICIENCY_BASELINE.model}</p>
          </div>
          {summary.whPerKm == null ? (
            <p className="odometer-value is-empty">尚缺里程</p>
          ) : (
            <p className="odometer-value">
              {twd(summary.whPerKm, 0)}
              <span className="unit">Wh/km</span>
            </p>
          )}
          <p className="odometer-sub">
            {summary.whPerKm == null
              ? `基準 ${twd(baselineWhPerKm, 0)} Wh/km。充電時記下里程表，就能比較。`
              : `${efficiencyText(efficiencyGap)}。基準 ${twd(baselineWhPerKm, 0)} Wh/km，這段充了 ${kwh(summary.kWh)}。`}
            {` ${EFFICIENCY_BASELINE.source} ${EFFICIENCY_BASELINE.kmPerKwh} 公里/度。帳本用充電度數除以里程，含充電損耗。`}
          </p>
        </div>
      </section>

      <section className="split-stats">
        <article className="stat">
          <p className="stat-label">期間持有成本</p>
          <p className="stat-value">{money(summary.total)}</p>
          <p className="stat-hint">{summary.months} 個月合計</p>
        </article>
        <button type="button" className="stat is-openable" onClick={() => setDetail('amort')}>
          <p className="stat-label">購置攤提</p>
          <p className="stat-value">{money(summary.amort)}</p>
          <p className="stat-hint">點擊看明細</p>
        </button>
        <button type="button" className="stat is-openable" onClick={() => setDetail('fixed')}>
          <p className="stat-label">固定支出</p>
          <p className="stat-value">{money(summary.fixed)}</p>
          <p className="stat-hint">點擊看明細</p>
        </button>
        <button type="button" className="stat is-openable" onClick={() => setDetail('charge')}>
          <p className="stat-label">充電</p>
          <p className="stat-value ion">{money(summary.charge)}</p>
          <p className="stat-hint">點擊看明細</p>
        </button>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h3>充電報表</h3>
        </div>
        {detailData.chargeLines.length === 0 ? (
          <p className="empty">這段期間還沒有充電紀錄。</p>
        ) : (
          <>
            <div className="split-stats report-stats">
              <article className="stat">
                <p className="stat-label">次數</p>
                <p className="stat-value">{detailData.chargeLines.length}</p>
                <p className="stat-hint">
                  平日 {habits.weekday} · 週末 {habits.weekend}
                </p>
              </article>
              <article className="stat">
                <p className="stat-label">充電量</p>
                <p className="stat-value ion">{kwh(summary.kWh)}</p>
                <p className="stat-hint">這段區間合計</p>
              </article>
              <article className="stat">
                <p className="stat-label">平均電價</p>
                <p className="stat-value">{unitPrice == null ? '—' : money(unitPrice, 2)}</p>
                <p className="stat-hint">花費 ÷ 度數</p>
              </article>
              <article className="stat">
                <p className="stat-label">每度公里</p>
                <p className="stat-value">{kmPerKwh == null ? '尚缺里程' : twd(kmPerKwh, 1)}</p>
                <p className="stat-hint">{kmPerKwh == null ? '充電時記下里程表' : '公里 / 度'}</p>
              </article>
            </div>

            <div className="report-block">
              <h4>品牌花費</h4>
              <ul className="share-list">
                {brands.map((row) => {
                  const share =
                    brandCost > 0 ? (row.cost / brandCost) * 100 : summary.kWh > 0 ? (row.kWh / summary.kWh) * 100 : 0
                  return (
                    <li key={row.provider}>
                      <div className="share-top">
                        <span>{providerLabel(row.provider)}</span>
                        <span>
                          {money(row.cost)} · {Math.round(share)}%
                        </span>
                      </div>
                      <div className="share-meter" aria-hidden="true">
                        <span style={{ width: `${share}%` }} />
                      </div>
                      <p className="row-meta">
                        {row.count} 筆 · {kwh(row.kWh)}
                      </p>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className="report-block">
              <h4>充電時段</h4>
              <ul className="share-list">
                {habits.bands.map((row) => {
                  const share = habitKwh > 0 ? (row.kWh / habitKwh) * 100 : 0
                  return (
                    <li key={row.id}>
                      <div className="share-top">
                        <span>{row.label}</span>
                        <span>
                          {row.count} 筆 · {Math.round(share)}%
                        </span>
                      </div>
                      <div className="share-meter" aria-hidden="true">
                        <span style={{ width: `${share}%` }} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          </>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h3>近半年花費</h3>
        </div>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chart} barCategoryGap={16}>
              <CartesianGrid stroke="rgba(232, 160, 74, 0.08)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#8a8174', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: 'rgba(232, 160, 74, 0.06)' }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  const row = payload[0].payload as (typeof chart)[number]
                  return (
                    <div className="chart-tip">
                      <p>{label}</p>
                      <p>合計 {money(row.total)}</p>
                      <p>充電 {money(row.charge)}</p>
                      <p>{kwh(row.kWh)}</p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="amort" stackId="cost" fill="#5c4630" name="攤提" />
              <Bar dataKey="fixed" stackId="cost" fill="#c46a2a" name="固定" />
              <Bar dataKey="charge" stackId="cost" fill="#6a9e96" name="充電" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h3>最近充電</h3>
          <Link to="/charges" className="text-link">
            全部紀錄
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="empty">
            還沒有充電紀錄。到充電頁手打一筆，或掃描充電單。
          </p>
        ) : (
          <ul className="timeline">
            {recent.map((charge) => (
              <li key={charge.id}>
                <div>
                  <p className="row-title">{providerLabel(charge.provider)}</p>
                  <p className="row-meta">
                    {formatDateTime(charge.chargedAt)}
                    {charge.location ? ` · ${charge.location}` : ''}
                  </p>
                </div>
                <div className="row-end">
                  <p>{money(charge.costTwd)}</p>
                  <p className="row-meta">{kwh(charge.kWh)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <BreakdownDialog
        open={detail === 'amort'}
        eyebrow="明細"
        title="購置攤提"
        total={`${detailData.months} 個月合計 ${money(summary.amort)}`}
        onClose={() => setDetail(null)}
      >
        <ul className="timeline">
          {vehicle.purchaseItems.map((item) => (
            <li key={item.id}>
              <div>
                <p className="row-title">{item.name || '未命名項目'}</p>
                <p className="row-meta">購置項目</p>
              </div>
              <p className="row-end">{money(item.amount)}</p>
            </li>
          ))}
          <li>
            <div>
              <p className="row-title">購置合計</p>
              <p className="row-meta">各項目加總</p>
            </div>
            <p className="row-end">{money(detailData.purchaseSum)}</p>
          </li>
          <li>
            <div>
              <p className="row-title">殘值</p>
              <p className="row-meta">從購置合計扣除後再攤提</p>
            </div>
            <p className="row-end">{money(vehicle.residualValue)}</p>
          </li>
          <li>
            <div>
              <p className="row-title">持有 {vehicle.ownershipYears} 年</p>
              <p className="row-meta">
                （{money(detailData.purchaseSum)} − {money(vehicle.residualValue)}）÷{' '}
                {vehicle.ownershipYears * 12} 個月
              </p>
            </div>
            <p className="row-end">{money(detailData.monthlyAmort)}</p>
          </li>
          <li>
            <div>
              <p className="row-title">這段期間攤提</p>
              <p className="row-meta">
                每月 {money(detailData.monthlyAmort)} × {detailData.months} 個月
              </p>
            </div>
            <p className="row-end">{money(summary.amort)}</p>
          </li>
        </ul>
      </BreakdownDialog>

      <BreakdownDialog
        open={detail === 'fixed'}
        eyebrow="明細"
        title="固定支出"
        total={`${detailData.months} 個月合計 ${money(summary.fixed)}`}
        onClose={() => setDetail(null)}
      >
        {detailData.fixedLines.length === 0 ? (
          <p className="empty">這段期間沒有固定支出。</p>
        ) : (
          <ul className="timeline">
            {detailData.fixedLines.map(({ expense, amount }) => (
              <li key={expense.id}>
                <div>
                  <p className="row-title">{expense.name}</p>
                  <p className="row-meta">
                    {categoryLabel(expense.category)} · {recurrenceLabel(expense.recurrence)}{' '}
                    {money(expense.amount)}
                    {expense.startDate ? ` · 自 ${formatDate(expense.startDate)}` : ''}
                  </p>
                </div>
                <p className="row-end">{money(amount)}</p>
              </li>
            ))}
          </ul>
        )}
      </BreakdownDialog>

      <BreakdownDialog
        open={detail === 'charge'}
        eyebrow="明細"
        title="充電"
        total={`${detailData.chargeLines.length} 筆合計 ${money(summary.charge)}`}
        onClose={() => setDetail(null)}
      >
        {detailData.chargeLines.length === 0 ? (
          <p className="empty">這段期間還沒有充電紀錄。</p>
        ) : (
          <ul className="timeline">
            {detailData.chargeLines.map((charge) => (
              <li key={charge.id}>
                <div>
                  <p className="row-title">{providerLabel(charge.provider)}</p>
                  <p className="row-meta">
                    {formatDateTime(charge.chargedAt)}
                    {charge.location ? ` · ${charge.location}` : ''}
                    {charge.odometerKm != null ? ` · ${charge.odometerKm} km` : ''}
                    {legs.get(charge.id)
                      ? ` · 這趟 ${twd(legs.get(charge.id)!.km, 0)} km · ${money(legs.get(charge.id)!.perKm, 2)}/km`
                      : ''}
                  </p>
                </div>
                <div className="row-end">
                  <p>{money(charge.costTwd)}</p>
                  <p className="row-meta">{kwh(charge.kWh)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </BreakdownDialog>
    </div>
  )
}
