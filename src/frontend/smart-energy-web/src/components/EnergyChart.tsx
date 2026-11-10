import { useMemo } from 'react'
import type { EnergyConsumptionPoint } from '../services/energyService'

export type HistoryPeriod = 'all' | 'hour' | 'today' | '7days' | 'month'

type EnergyChartProps = {
  data: EnergyConsumptionPoint[]
  period: HistoryPeriod
}

type ChartPoint = EnergyConsumptionPoint & { hasData: boolean }

type BucketSize = 'minute' | 'hour' | 'day'
type PositionedPoint = ChartPoint & { timestamp: number; x: number; y: number }

function formatKwh(value: number) {
  if (!Number.isFinite(value)) return '—'
  if (value === 0) return '0,000'

  // Keep the chart compact, but never display a positive consumption as zero.
  const decimals = Math.abs(value) >= 0.001
    ? 3
    : Math.min(8, Math.max(4, Math.ceil(-Math.log10(Math.abs(value))) + 2))

  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function formatTime(date: Date, period: HistoryPeriod, bucketSize: BucketSize) {
  if (bucketSize === 'day' || period === '7days' || period === 'month') {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }

  if (bucketSize === 'hour') {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function getBucketSize(data: EnergyConsumptionPoint[], period: HistoryPeriod): BucketSize {
  if (period === 'hour') return 'minute'
  if (period === 'today' || period === '7days' || period === 'month') {
    return period === 'today' ? 'hour' : 'day'
  }

  if (data.length < 2) return 'minute'
  const timestamps = data
    .map((item) => new Date(item.dataHora).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => a - b)

  if (timestamps.length < 2) return 'minute'
  const spanMs = timestamps[timestamps.length - 1] - timestamps[0]
  if (spanMs <= 2 * 60 * 60 * 1000) return 'minute'
  if (spanMs <= 3 * 24 * 60 * 60 * 1000) return 'hour'
  return 'day'
}

function getBucketDate(date: Date, bucketSize: BucketSize) {
  const bucketDate = new Date(date)
  if (bucketSize === 'minute') {
    bucketDate.setSeconds(0, 0)
  } else if (bucketSize === 'hour') {
    bucketDate.setMinutes(0, 0, 0)
  } else {
    bucketDate.setHours(0, 0, 0, 0)
  }
  return bucketDate
}

function aggregateByPeriod(data: EnergyConsumptionPoint[], period: HistoryPeriod): ChartPoint[] {
  const now = new Date()
  const start = new Date(now)
  if (period === 'hour') start.setHours(now.getHours() - 1)
  if (period === 'today') start.setHours(0, 0, 0, 0)
  if (period === '7days') {
    // Mantém o mesmo intervalo da página: as últimas 168 horas.
    start.setTime(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  }
  if (period === 'month') {
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
  }

  const filtered = data
    .map((item) => ({ ...item, timestamp: new Date(item.dataHora).getTime() }))
    .filter((item) => Number.isFinite(item.timestamp) && (period === 'all' || (item.timestamp >= start.getTime() && item.timestamp <= now.getTime())))
    .sort((a, b) => a.timestamp - b.timestamp)

  if (filtered.length === 0) return []

  const bucketSize = getBucketSize(filtered, period)
  const buckets = new Map<number, { date: Date; consumption: number; powerTotal: number; count: number }>()

  for (const item of filtered) {
    const date = new Date(item.timestamp)
    const bucketDate = getBucketDate(date, bucketSize)
    const key = bucketDate.getTime()
    const bucket = buckets.get(key) ?? { date: bucketDate, consumption: 0, powerTotal: 0, count: 0 }
    bucket.consumption += item.consumption
    bucket.powerTotal += item.potenciaMedia
    bucket.count += 1
    buckets.set(key, bucket)
  }

  const aggregated: ChartPoint[] = [...buckets.values()]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((bucket) => ({
      dataHora: bucket.date.toISOString(),
      label: formatTime(bucket.date, period, bucketSize),
      consumption: bucket.consumption,
      potenciaMedia: bucket.count > 0 ? bucket.powerTotal / bucket.count : 0,
      hasData: true,
    }))

  // Nos gráficos de barras, completa todos os intervalos do período visível,
  // inclusive os dias/horas sem medições nas extremidades.
  if (period !== 'today' && period !== '7days' && period !== 'month') {
    return aggregated
  }

  const pointsByTimestamp = new Map(
    aggregated.map((point) => [new Date(point.dataHora).getTime(), point]),
  )
  const firstDate = new Date(start)
  const lastDate = new Date(now)

  if (bucketSize === 'hour') {
    firstDate.setMinutes(0, 0, 0)
    lastDate.setMinutes(0, 0, 0)
  } else {
    firstDate.setHours(0, 0, 0, 0)
    lastDate.setHours(0, 0, 0, 0)
  }

  const complete: ChartPoint[] = []
  for (const cursor = new Date(firstDate); cursor.getTime() <= lastDate.getTime();) {
    const timestamp = cursor.getTime()
    const existing = pointsByTimestamp.get(timestamp)

    complete.push(existing ?? {
      dataHora: cursor.toISOString(),
      label: formatTime(cursor, period, bucketSize),
      consumption: 0,
      potenciaMedia: 0,
      hasData: false,
    })

    if (bucketSize === 'hour') cursor.setHours(cursor.getHours() + 1)
    else cursor.setDate(cursor.getDate() + 1)
  }

  return complete
}

function getGapThresholdMs(period: HistoryPeriod, points: ChartPoint[]) {
  if (period === 'hour') return 90 * 1000
  if (period === 'today') return 90 * 60 * 1000
  if (period === '7days' || period === 'month') return 36 * 60 * 60 * 1000
  if (points.length < 2) return 90 * 1000
  const first = new Date(points[0].dataHora).getTime()
  const last = new Date(points[points.length - 1].dataHora).getTime()
  const span = last - first
  if (span <= 2 * 60 * 60 * 1000) return 90 * 1000
  if (span <= 3 * 24 * 60 * 60 * 1000) return 90 * 60 * 1000
  return 36 * 60 * 60 * 1000
}

function splitIntoSegments(points: PositionedPoint[], maxGapMs: number) {
  const segments: PositionedPoint[][] = []
  for (const point of points) {
    const current = segments[segments.length - 1]
    const previous = current?.[current.length - 1]
    if (!current || !previous || point.timestamp - previous.timestamp > maxGapMs) segments.push([point])
    else current.push(point)
  }
  return segments
}

function getChartTitle(period: HistoryPeriod) {
  if (period === 'hour') return 'Consumo agrupado por minuto (kWh)'
  if (period === 'today') return 'Consumo agrupado por hora (kWh)'
  if (period === '7days' || period === 'month') return 'Consumo agrupado por dia (kWh)'
  return 'Consumo agrupado conforme o período disponível (kWh)'
}

function getChartRange(period: HistoryPeriod, points: ChartPoint[]) {
  if (period === 'all') {
    return {
      start: new Date(points[0].dataHora).getTime(),
      end: new Date(points[points.length - 1].dataHora).getTime(),
    }
  }

  const end = Date.now()
  const startDate = new Date(end)

  if (period === 'hour') {
    startDate.setTime(end - 60 * 60 * 1000)
  } else if (period === 'today') {
    startDate.setHours(0, 0, 0, 0)
  } else if (period === '7days') {
    startDate.setTime(end - 7 * 24 * 60 * 60 * 1000)
  } else if (period === 'month') {
    startDate.setDate(1)
    startDate.setHours(0, 0, 0, 0)
  }

  return { start: startDate.getTime(), end }
}

function formatRangeLabel(timestamp: number, period: HistoryPeriod) {
  const date = new Date(timestamp)
  if (period === '7days' || period === 'month') {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function getVisibleLabelIndexes(points: PositionedPoint[], _labelStep: number) {
  if (points.length === 0) return new Set<number>()
  if (points.length === 1) return new Set([0])

  // Pick labels using actual horizontal spacing rather than point indexes.
  // This keeps dates distributed across the available chart width.
  const minimumDistance = 76
  const visible = new Set<number>([0, points.length - 1])
  let lastVisibleIndex = 0

  for (let index = 1; index < points.length - 1; index += 1) {
    const point = points[index]
    const lastPoint = points[lastVisibleIndex]

    if (point.x - lastPoint.x >= minimumDistance) {
      visible.add(index)
      lastVisibleIndex = index
    }
  }

  // When the final label is too close to the previous one, keep the final
  // label and remove a nearby middle label so the range remains identifiable.
  const indexes = [...visible].sort((a, b) => a - b)
  if (indexes.length >= 3) {
    const lastMiddleIndex = indexes[indexes.length - 2]
    if (points[points.length - 1].x - points[lastMiddleIndex].x < minimumDistance) {
      visible.delete(lastMiddleIndex)
    }
  }

  return visible
}

export default function EnergyChart({ data, period }: EnergyChartProps) {
  const chartData = useMemo(() => aggregateByPeriod(data, period), [data, period])

  if (chartData.length === 0) {
    return <p className="empty-state">Não há medições nesse período. Escolha outro intervalo ou aguarde novas leituras do aparelho.</p>
  }

  const width = 900
  const height = 360
  const padding = { top: 38, right: 28, bottom: 54, left: 82 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom
  const maxValue = Math.max(...chartData.map((item) => item.consumption), 0)
  const yMax = maxValue > 0 ? maxValue * 1.15 : 1
  const baseline = padding.top + chartHeight

  const timestamps = chartData.map((item) =>
    new Date(item.dataHora).getTime()
  )
  const chartRange = getChartRange(period, chartData)
  const minTimestamp = chartRange.start
  const maxTimestamp = chartRange.end
  const timeSpan = maxTimestamp - minTimestamp

  const useBars = period === 'today' || period === '7days' || period === 'month'
  const isDailyBars = period === '7days' || period === 'month'
  const firstBucketDate = new Date(chartRange.start)
  const lastBucketDate = new Date(chartRange.end)
  firstBucketDate.setHours(0, 0, 0, 0)
  lastBucketDate.setHours(0, 0, 0, 0)
  const dailyBucketCount = isDailyBars
    ? Math.round((lastBucketDate.getTime() - firstBucketDate.getTime()) / (24 * 60 * 60 * 1000)) + 1
    : 0

  const points: PositionedPoint[] = chartData.map((item, index) => {
    const timestamp = timestamps[index]
    let x: number

    if (isDailyBars && dailyBucketCount > 0) {
      // Cada dia ocupa uma faixa uniforme; a barra fica no centro da data,
      // inclusive no primeiro e no último dia de um período parcial.
      const bucketDate = new Date(item.dataHora)
      bucketDate.setHours(0, 0, 0, 0)
      const dayIndex = Math.round(
        (bucketDate.getTime() - firstBucketDate.getTime()) / (24 * 60 * 60 * 1000),
      )
      x = padding.left + ((dayIndex + 0.5) / dailyBucketCount) * chartWidth
    } else if (period === 'today') {
      const bucketDate = new Date(item.dataHora)
      const hourIndex = bucketDate.getHours()
      x = padding.left + ((hourIndex + 0.5) / 24) * chartWidth
    } else {
      const boundedTimestamp = Math.min(maxTimestamp, Math.max(minTimestamp, timestamp))
      x = timeSpan > 0
        ? padding.left + ((boundedTimestamp - minTimestamp) / timeSpan) * chartWidth
        : padding.left + chartWidth / 2
    }

    const y = padding.top + chartHeight - (item.consumption / yMax) * chartHeight
    return { ...item, timestamp, x, y }
  })

  const labelStep = Math.max(1, Math.ceil(points.length / 8))
  // Valores agregados por hora/dia são comparações entre intervalos, não uma linha contínua.
  const barWidth = Math.min(30, Math.max(12, chartWidth / Math.max(points.length * 1.8, 1)))
  const visibleLabelIndexes = getVisibleLabelIndexes(points, labelStep)
  const showRangeLabels = period !== 'all'
  if (showRangeLabels) {
    visibleLabelIndexes.delete(0)
    visibleLabelIndexes.delete(points.length - 1)
  }
  const gapThresholdMs = getGapThresholdMs(period, chartData)
  const lineSegments = splitIntoSegments(points, gapThresholdMs)
  const gridLines = Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4
    return { y: padding.top + chartHeight * ratio, value: yMax * (1 - ratio) }
  })

  return (
    <div className="chart-shell" aria-label={`Histórico de consumo agregado por período. ${useBars ? 'Barras representam energia consumida em cada intervalo.' : 'A linha representa a evolução dos valores agregados.'}`}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img">
        <defs>
          <linearGradient id="energy-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#1d8cff" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#1d8cff" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {gridLines.map((line) => (
          <g key={line.y}>
            <line className="chart-grid" x1={padding.left} x2={width - padding.right} y1={line.y} y2={line.y} />
            <text className="axis-label" x={padding.left - 10} y={line.y + 4} textAnchor="end">{formatKwh(line.value)}</text>
          </g>
        ))}
        {!useBars && lineSegments.map((segment, segmentIndex) => {
          if (segment.length < 2) return null
          const linePath = segment
            .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
            .join(' ')
          const areaPath = `${linePath} L ${segment[segment.length - 1].x} ${baseline} L ${segment[0].x} ${baseline} Z`
          return (
            <g key={`segment-${segmentIndex}`}>
              <path className="chart-area" d={areaPath} />
              <path className="chart-line" d={linePath} />
            </g>
          )
        })}
        {showRangeLabels ? (
          <>
            <text
              className="axis-label"
              x={isDailyBars ? padding.left + chartWidth / (2 * dailyBucketCount) : period === 'today' ? padding.left + chartWidth / 48 : padding.left}
              y={height - 22}
              textAnchor="middle"
            >
              {formatRangeLabel(minTimestamp, period)}
            </text>
            <text
              className="axis-label"
              x={isDailyBars ? padding.left + chartWidth * (dailyBucketCount - 0.5) / dailyBucketCount : period === 'today' ? padding.left + chartWidth * (new Date(maxTimestamp).getHours() + 0.5) / 24 : width - padding.right}
              y={height - 22}
              textAnchor="middle"
            >
              {formatRangeLabel(maxTimestamp, period)}
            </text>
          </>
        ) : null}
        {points.map((point, index) => (
          <g className="chart-point" key={`${point.dataHora}-${index}`}>
            {visibleLabelIndexes.has(index) ? (
              <>
                <line className="x-marker" x1={point.x} x2={point.x} y1={baseline} y2={baseline + 6} />
                <text className="axis-label" x={point.x} y={height - 22} textAnchor="middle">{point.label}</text>
              </>
            ) : null}
            {useBars ? (
              point.hasData ? (
                <>
                  <rect
                    className="chart-bar"
                    x={point.x - barWidth / 2}
                    y={point.y}
                    width={barWidth}
                    height={Math.max(0, baseline - point.y)}
                    rx={4}
                    fill="#1d8cff"
                    fillOpacity={0.82}
                  >
                    <title>{`${point.label}: ${formatKwh(point.consumption)} kWh; potência média ${point.potenciaMedia.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} W`}</title>
                  </rect>
                  {points.length <= 12 ? (
                    <text
                      className="bar-value-label"
                      x={point.x}
                      y={Math.max(point.y - 9, padding.top - 8)}
                      textAnchor="middle"
                    >
                      {formatKwh(point.consumption)}
                    </text>
                  ) : null}
                </>
              ) : null
            ) : (
              <>
                <circle className="chart-dot low" cx={point.x} cy={point.y} r={points.length > 40 ? 2.5 : 4} />
                <g className="point-tooltip">
              <rect className="tooltip-box" x={Math.min(Math.max(point.x - 62, padding.left), width - padding.right - 124)} y={Math.max(point.y - 62, 8)} width="124" height="56" rx="8" />
              <text className="tooltip-label" x={Math.min(Math.max(point.x, padding.left + 62), width - padding.right - 62)} y={Math.max(point.y - 39, 31)} textAnchor="middle">{point.label}</text>
              <text className="tooltip-value" x={Math.min(Math.max(point.x, padding.left + 62), width - padding.right - 62)} y={Math.max(point.y - 22, 47)} textAnchor="middle">{formatKwh(point.consumption)} kWh</text>
              <text className="tooltip-money" x={Math.min(Math.max(point.x, padding.left + 62), width - padding.right - 62)} y={Math.max(point.y - 6, 61)} textAnchor="middle">{point.potenciaMedia.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} W médios</text>
                </g>
              </>
            )}
          </g>
        ))}
        <text className="axis-title" x={padding.left} y="18">{getChartTitle(period)}</text>
      </svg>
    </div>
  )
}
