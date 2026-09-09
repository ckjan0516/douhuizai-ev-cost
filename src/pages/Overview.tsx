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
import { monthlySeries, summarizePeriod } from '../lib/calc'
import { formatDateTime, kwh, money, providerLabel, twd } from '../lib/format'
import { useLedger } from '../hooks/useLedger'
import type { PeriodKey } from '../types'

const periods: Array<{ id: PeriodKey; label: string }> = [
  { id: 'month', label: '本月' },
  { id: 'quarter', label: '近 3 個月' },
  { id: 'year', label: '今年' },
  { id: 'all', label: '自購車' },
]

export function OverviewPage() {
  const { vehicle, expenses, charges, ready, error, migrated } = useLedger()
  const [period, setPeriod] = useState<PeriodKey>('month')

  const summary = useMemo(() => {
    if (!vehicle) return null
    return summarizePeriod(vehicle, expenses, charges, period)
  }, [vehicle, expenses, charges, period])

  const chart = useMemo(() => {
    if (!vehicle) return []
    return monthlySeries(vehicle, expenses, charges, 6)
  }, [vehicle, expenses, charges])

  if (error) return <p className="alert">{error}</p>
  if (!ready || !vehicle || !summary) return <p className="fine">讀取行程電腦…</p>

  const recent = charges.slice(0, 4)

  return (
    <div className="stack">
      {migrated ? (
        <p className="fine">已把這台瀏覽器裡的舊帳本搬到你的 Google 帳號。</p>
      ) : null}
      <section className="cluster">
        <div className="cluster-head">
          <div>
            <p className="eyebrow">{vehicle.model || '尚未填車型'}</p>
            <h2 className="display-name">{vehicle.nickname}</h2>
          </div>
          <div className="period-switch" role="tablist" aria-label="統計期間">
            {periods.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={period === item.id}
                className={period === item.id ? 'chip is-on' : 'chip'}
                onClick={() => setPeriod(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="odometer">
          <p className="odometer-label">每公里成本</p>
          {summary.perKm == null ? (
            <p className="odometer-value is-empty">尚缺里程</p>
          ) : (
            <p className="odometer-value">
              <span className="currency">NT$</span>
              {twd(summary.perKm, 2)}
              <span className="unit">/ km</span>
            </p>
          )}
          <p className="odometer-sub">
            {summary.km == null
              ? '充電時記下里程表，就能換算每公里要多少'
              : `這段期間走了 ${twd(summary.km)} 公里`}
          </p>
        </div>
      </section>

      <section className="split-stats">
        <article className="stat">
          <p className="stat-label">期間持有成本</p>
          <p className="stat-value">{money(summary.total)}</p>
          <p className="stat-hint">{summary.months} 個月合計</p>
        </article>
        <article className="stat">
          <p className="stat-label">購置攤提</p>
          <p className="stat-value">{money(summary.amort)}</p>
        </article>
        <article className="stat">
          <p className="stat-label">固定支出</p>
          <p className="stat-value">{money(summary.fixed)}</p>
        </article>
        <article className="stat">
          <p className="stat-label">充電</p>
          <p className="stat-value ion">{money(summary.charge)}</p>
        </article>
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
    </div>
  )
}
