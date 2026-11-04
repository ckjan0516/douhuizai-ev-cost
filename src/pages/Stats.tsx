import { useMemo, useState } from 'react'
import { TrendChart } from '../components/TrendChart'
import { useLedger } from '../hooks/useLedger'
import { chargeLegs, chargeTrend, ownershipCostTrend, type ChargeTrendPoint } from '../lib/calc'
import { formatDateTime, providerLabel } from '../lib/format'

type StatsMetric = 'cost' | 'wh' | 'unit' | 'perKm'

const METRICS: Array<{ id: StatsMetric; label: string }> = [
  { id: 'cost', label: '持有成本' },
  { id: 'wh', label: '每公里電耗' },
  { id: 'unit', label: '單價' },
  { id: 'perKm', label: '每公里電費' },
]

export function StatsPage() {
  const { vehicle, expenses, charges, ready, error } = useLedger()
  const [metric, setMetric] = useState<StatsMetric>('cost')
  const legs = useMemo(() => chargeLegs(charges), [charges])
  const byId = useMemo(() => new Map(charges.map((charge) => [charge.id, charge])), [charges])

  const points = useMemo(() => {
    if (!vehicle) return []
    if (metric === 'cost') return ownershipCostTrend(vehicle, expenses, charges)
    if (metric === 'wh') return chargeTrend(charges, legs, 'wh')
    if (metric === 'unit') return chargeTrend(charges, legs, 'unit')
    return chargeTrend(charges, legs, 'perKm')
  }, [vehicle, expenses, charges, legs, metric])

  if (error) return <p className="alert">{error}</p>
  if (!ready || !vehicle) return <p className="fine">讀取統計…</p>

  const spec = {
    cost: {
      unit: '元',
      digits: 0,
      asMoney: true,
      weightHint: '每月合計',
      emptyText: '至少要有兩個月，才畫得出持有成本。',
    },
    wh: {
      unit: 'Wh/km',
      digits: 0,
      asMoney: false,
      weightHint: '依里程加權',
      emptyText: '至少兩筆有前後里程的紀錄，才畫得出每公里電耗。',
    },
    unit: {
      unit: '元/度',
      digits: 2,
      asMoney: false,
      weightHint: '依度數加權',
      emptyText: '至少兩筆有度數的紀錄，才畫得出單價。',
    },
    perKm: {
      unit: '元/km',
      digits: 2,
      asMoney: true,
      weightHint: '依里程加權',
      emptyText: '至少兩筆有前後里程的紀錄，才畫得出每公里電費。',
    },
  }[metric]

  function caption(point: ChargeTrendPoint): string {
    const charge = byId.get(point.id)
    if (!charge) return point.label
    const place = charge.location ? ` · ${charge.location}` : ''
    return `${formatDateTime(charge.chargedAt)} · ${providerLabel(charge.provider)}${place}`
  }

  return (
    <div className="stack">
      <section className="page-lead">
        <p className="eyebrow">統計</p>
        <h2>趨勢</h2>
        <p className="lede">由左到右是時間先後。紅點是離群值，虛線是平均。</p>
      </section>
      <div className="mini-actions">
        {METRICS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === metric ? 'chip is-on' : 'chip'}
            onClick={() => setMetric(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <TrendChart key={metric} points={points} caption={caption} {...spec} />
    </div>
  )
}
