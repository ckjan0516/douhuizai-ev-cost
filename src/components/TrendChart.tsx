import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { chargeTrendAverage, type ChargeTrendPoint } from '../lib/calc'
import { money, twd } from '../lib/format'

interface TrendChartProps {
  points: ChargeTrendPoint[]
  unit: string
  digits: number
  asMoney: boolean
  weightHint: string
  emptyText: string
  caption: (point: ChargeTrendPoint) => string
}

function TrendDot(props: { cx?: number; cy?: number; payload?: ChargeTrendPoint }) {
  const { cx, cy, payload } = props
  if (cx == null || cy == null || !payload) return null
  return <circle cx={cx} cy={cy} r={payload.outlier ? 5.5 : 3} fill={payload.outlier ? '#e31937' : '#5ce1ff'} />
}

function formatPoint(value: number, digits: number, asMoney: boolean): string {
  return asMoney ? money(value, digits) : twd(value, digits)
}

export function TrendChart({ points, unit, digits, asMoney, weightHint, emptyText, caption }: TrendChartProps) {
  const [includeOutliers, setIncludeOutliers] = useState(false)
  const average = useMemo(() => chargeTrendAverage(points, includeOutliers), [points, includeOutliers])
  const counted = includeOutliers ? points.length : points.filter((point) => !point.outlier).length
  const outliers = points.filter((point) => point.outlier)
  const chartPoints = points.map((point) => ({ ...point, average }))

  return (
    <section className="panel">
      <div className="trend-average">
        <p className="stat-label">平均</p>
        <p className="stat-value ion">{average == null ? '—' : formatPoint(average, digits, asMoney)}</p>
      </div>
      <p className="fine">
        {average == null
          ? '沒有可計算的一般紀錄。'
          : `${includeOutliers ? '含離群值' : '不含離群值'} · ${counted} 筆 · ${weightHint} · ${unit}`}
      </p>
      <div className="mini-actions trend-toggle">
        <button
          type="button"
          className={includeOutliers ? 'chip' : 'chip is-on'}
          onClick={() => setIncludeOutliers(false)}
        >
          不含離群值
        </button>
        <button
          type="button"
          className={includeOutliers ? 'chip is-on' : 'chip'}
          onClick={() => setIncludeOutliers(true)}
        >
          含離群值
        </button>
      </div>
      {points.length < 2 ? (
        <p className="empty">{emptyText}</p>
      ) : (
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartPoints} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(92, 225, 255, 0.08)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#8d99ad', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                width={asMoney ? 56 : 42}
                tick={{ fill: '#8d99ad', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value: number) => twd(value, digits > 0 ? 1 : 0)}
              />
              <Tooltip
                cursor={{ stroke: 'rgba(92, 225, 255, 0.35)' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const row = payload.find((item) => item.dataKey === 'value') ?? payload[0]
                  const point = row.payload as ChargeTrendPoint
                  return (
                    <div className="chart-tip">
                      <p>{caption(point)}</p>
                      <p>
                        {formatPoint(point.value, digits, asMoney)} {unit}
                      </p>
                      {point.outlier ? <p className="is-review">離群 · {point.reason}</p> : null}
                    </div>
                  )
                }}
              />
              {average != null ? (
                <Line
                  type="monotone"
                  dataKey="average"
                  stroke="#7dffe1"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
              ) : null}
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
          <i className="is-mean" />
          平均
        </span>
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
          {outliers.map((point) => (
            <li key={point.id}>
              <div>
                <p className="row-title is-review">{point.reason}</p>
                <p className="row-meta">{caption(point)}</p>
              </div>
              <div className="row-end">
                <p>{formatPoint(point.value, digits, asMoney)}</p>
                <p className="row-meta">{unit}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : points.length >= 2 ? (
        <p className="fine">這批紀錄沒有離群值。</p>
      ) : null}
    </section>
  )
}
