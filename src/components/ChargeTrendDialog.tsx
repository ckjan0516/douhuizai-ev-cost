import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  CHARGE_TREND_METRICS,
  chargeTrend,
  type ChargeLeg,
  type ChargeTrendMetric,
  type ChargeTrendPoint,
} from '../lib/calc'
import { formatDateTime, money, providerLabel, twd } from '../lib/format'
import type { ChargeSession } from '../types'
import { BreakdownDialog } from './BreakdownDialog'

interface ChargeTrendDialogProps {
  open: boolean
  charges: ChargeSession[]
  legs: Map<string, ChargeLeg>
  onClose: () => void
  onOpenCharge: (charge: ChargeSession) => void
}

function TrendDot(props: { cx?: number; cy?: number; payload?: ChargeTrendPoint }) {
  const { cx, cy, payload } = props
  if (cx == null || cy == null || !payload) return null
  return (
    <circle cx={cx} cy={cy} r={payload.outlier ? 5.5 : 3} fill={payload.outlier ? '#e31937' : '#5ce1ff'} />
  )
}

export function ChargeTrendDialog({ open, charges, legs, onClose, onOpenCharge }: ChargeTrendDialogProps) {
  const [metric, setMetric] = useState<ChargeTrendMetric>('unit')
  const metricMeta = CHARGE_TREND_METRICS.find((item) => item.id === metric) ?? CHARGE_TREND_METRICS[0]
  const points = useMemo(() => chargeTrend(charges, legs, metric), [charges, legs, metric])
  const outliers = points.filter((point) => point.outlier)
  const byId = useMemo(() => new Map(charges.map((charge) => [charge.id, charge])), [charges])

  return (
    <BreakdownDialog
      open={open}
      eyebrow="統計"
      title="充電趨勢"
      total="由左到右是時間先後。紅點是離群值。"
      onClose={onClose}
    >
      <div className="mini-actions">
        {CHARGE_TREND_METRICS.map((item) => (
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
      {points.length < 2 ? (
        <p className="empty">
          {metric === 'unit'
            ? '至少兩筆有度數的紀錄，才畫得出單價趨勢。'
            : '至少兩筆有前後里程的紀錄，才畫得出這張圖。'}
        </p>
      ) : (
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={points} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(92, 225, 255, 0.08)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#8d99ad', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                width={42}
                tick={{ fill: '#8d99ad', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value: number) => twd(value, metric === 'unit' ? 1 : 0)}
              />
              <Tooltip
                cursor={{ stroke: 'rgba(92, 225, 255, 0.35)' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const point = payload[0].payload as ChargeTrendPoint
                  const charge = byId.get(point.id)
                  return (
                    <div className="chart-tip">
                      <p>{charge ? formatDateTime(charge.chargedAt) : point.label}</p>
                      <p>
                        {metric === 'perKm' ? money(point.value, 2) : twd(point.value, metric === 'unit' ? 2 : 0)}{' '}
                        {metricMeta.unit}
                      </p>
                      {point.outlier ? <p className="is-review">離群 · {point.reason}</p> : null}
                    </div>
                  )
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#5ce1ff"
                strokeWidth={1.5}
                dot={TrendDot}
                activeDot={{ r: 6 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="trend-legend">
        <span>
          <i />
          一般
        </span>
        <span>
          <i className="is-out" />
          離群值 {outliers.length}
        </span>
      </p>
      {outliers.length > 0 ? (
        <ul className="timeline">
          {outliers.map((point) => {
            const charge = byId.get(point.id)
            if (!charge) return null
            return (
              <li key={point.id}>
                <button type="button" className="timeline-main" onClick={() => onOpenCharge(charge)}>
                  <div>
                    <p className="row-title is-review">{point.reason}</p>
                    <p className="row-meta">
                      {formatDateTime(charge.chargedAt)} · {providerLabel(charge.provider)}
                    </p>
                  </div>
                  <div className="row-end">
                    <p>{metric === 'perKm' ? money(point.value, 2) : twd(point.value, metric === 'unit' ? 2 : 0)}</p>
                    <p className="row-meta">{metricMeta.unit}</p>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      ) : points.length >= 2 ? (
        <p className="fine">這批紀錄沒有離群值。</p>
      ) : null}
    </BreakdownDialog>
  )
}
