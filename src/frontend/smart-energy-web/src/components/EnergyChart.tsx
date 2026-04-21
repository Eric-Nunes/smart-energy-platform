import type { EnergyConsumptionPoint } from '../services/energyService'

type EnergyChartProps = {
  data: EnergyConsumptionPoint[]
  pricePerKwh: number
}

function getConsumptionLevel(consumption: number, maxValue: number) {
  const ratio = maxValue ? consumption / maxValue : 0

  if (ratio >= 0.75) return 'high'
  if (ratio >= 0.45) return 'medium'
  return 'low'
}

export default function EnergyChart({ data, pricePerKwh }: EnergyChartProps) {
  const width = 900
  const height = 360
  const padding = { top: 28, right: 28, bottom: 54, left: 58 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom
  const maxValue = Math.max(...data.map((item) => item.consumption), 1)
  const yMax = Math.ceil(maxValue * 1.18)

  const points = data.map((item, index) => {
    const x = padding.left + (chartWidth / Math.max(data.length - 1, 1)) * index
    const y = padding.top + chartHeight - (item.consumption / yMax) * chartHeight

    return { ...item, x, y }
  })

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')

  const areaPath = `${linePath} L ${points.at(-1)?.x ?? padding.left} ${
    padding.top + chartHeight
  } L ${padding.left} ${padding.top + chartHeight} Z`

  const gridLines = Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4
    const y = padding.top + chartHeight * ratio
    const value = Math.round(yMax * (1 - ratio))

    return { y, value }
  })

  return (
    <div className="chart-shell" aria-label="Gráfico de consumo de energia">
      <svg viewBox={`0 0 ${width} ${height}`} role="img">
        <defs>
          <linearGradient id="energy-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#1d8cff" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#1d8cff" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {gridLines.map((line) => (
          <g key={line.y}>
            <line
              className="chart-grid"
              x1={padding.left}
              x2={width - padding.right}
              y1={line.y}
              y2={line.y}
            />
            <text className="axis-label" x={padding.left - 12} y={line.y + 4} textAnchor="end">
              {line.value}
            </text>
          </g>
        ))}

        <path className="chart-area" d={areaPath} />
        <path className="chart-line" d={linePath} />

        {points.map((point) => (
          <g className="chart-point" key={point.label}>
            <line
              className="x-marker"
              x1={point.x}
              x2={point.x}
              y1={padding.top + chartHeight}
              y2={padding.top + chartHeight + 6}
            />
            <text className="axis-label" x={point.x} y={height - 22} textAnchor="middle">
              {point.label}
            </text>
            <circle
              className={`chart-dot ${getConsumptionLevel(point.consumption, maxValue)}`}
              cx={point.x}
              cy={point.y}
              r="6"
            />
            <g className="point-tooltip">
              <rect
                className="tooltip-box"
                x={Math.min(Math.max(point.x - 58, padding.left), width - padding.right - 116)}
                y={Math.max(point.y - 62, 8)}
                width="116"
                height="56"
                rx="8"
              />
              <text
                className="tooltip-label"
                x={Math.min(Math.max(point.x, padding.left + 58), width - padding.right - 58)}
                y={Math.max(point.y - 39, 31)}
                textAnchor="middle"
              >
                {point.label}
              </text>
              <text
                className="tooltip-value"
                x={Math.min(Math.max(point.x, padding.left + 58), width - padding.right - 58)}
                y={Math.max(point.y - 22, 47)}
                textAnchor="middle"
              >
                {point.consumption.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kWh
              </text>
              <text
                className="tooltip-money"
                x={Math.min(Math.max(point.x, padding.left + 58), width - padding.right - 58)}
                y={Math.max(point.y - 6, 61)}
                textAnchor="middle"
              >
                {(point.consumption * pricePerKwh).toLocaleString('pt-BR', {
                  currency: 'BRL',
                  style: 'currency',
                })}
              </text>
            </g>
          </g>
        ))}

        <text className="axis-title" x={padding.left} y="18">
          kWh consumidos
        </text>
      </svg>
    </div>
  )
}
