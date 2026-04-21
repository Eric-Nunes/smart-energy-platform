import type { DeviceConsumptionPoint } from '../services/energyService'

type DeviceConsumptionChartProps = {
  data: DeviceConsumptionPoint[]
  pricePerKwh: number
}

export default function DeviceConsumptionChart({
  data,
  pricePerKwh,
}: DeviceConsumptionChartProps) {
  const total = data.reduce((sum, item) => sum + item.consumption, 0)
  const maxValue = Math.max(...data.map((item) => item.consumption), 1)

  return (
    <div className="device-chart-list">
      {data.map((item) => {
        const percentage = total ? (item.consumption / total) * 100 : 0
        const barWidth = (item.consumption / maxValue) * 100

        return (
          <article className="device-row" key={item.device}>
            <div className="device-row-header">
              <strong>{item.device}</strong>
              <span>
                {item.consumption.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kWh
              </span>
            </div>

            <div className="device-bar" aria-hidden="true">
              <span style={{ width: `${barWidth}%` }} />
            </div>

            <div className="device-row-footer">
              <span>{percentage.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do total</span>
              <span>
                {(item.consumption * pricePerKwh).toLocaleString('pt-BR', {
                  currency: 'BRL',
                  style: 'currency',
                })}
              </span>
            </div>
          </article>
        )
      })}
    </div>
  )
}
