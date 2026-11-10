import type { DeviceConsumptionPoint } from '../services/energyService'

type DeviceConsumptionChartProps = {
  data: DeviceConsumptionPoint[]
}

function formatConsumption(value: number): string {
  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 6 })} kWh`
}

function formatCost(value: number): string {
  return value.toLocaleString('pt-BR', {
    currency: 'BRL',
    style: 'currency',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })
}

export default function DeviceConsumptionChart({ data }: DeviceConsumptionChartProps) {
  if (data.length === 0) {
    return <p className="empty-state">Nenhum aparelho cadastrado foi encontrado.</p>
  }

  const total = data.reduce((sum, item) => sum + item.consumption, 0)
  const maxValue = Math.max(...data.map((item) => item.consumption), 0)

  return (
    <div className="device-chart-list">
      {data.map((item) => {
        const percentage = total > 0 ? (item.consumption / total) * 100 : 0
        const barWidth = maxValue > 0 ? (item.consumption / maxValue) * 100 : 0
        const hasMonthlyIntervals = item.measurementCount > 0

        return (
          <article className="device-row" key={item.aparelhoId}>
            <div className="device-row-header">
              <strong>{item.device}</strong>
              <span>{formatConsumption(item.consumption)}</span>
            </div>

            <div
              className="device-bar"
              role="img"
              aria-label={`Consumo mensal de ${item.device}: ${formatConsumption(item.consumption)}`}
            >
              <span style={{ width: `${barWidth}%` }} />
            </div>

            <div className="device-row-footer">
              <span>
                {hasMonthlyIntervals
                  ? `${percentage.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do consumo mensal registrado`
                  : 'Sem intervalos válidos neste mês'}
              </span>
              <span>Custo estimado no mês: {formatCost(item.estimatedCost)}</span>
            </div>
          </article>
        )
      })}
    </div>
  )
}
