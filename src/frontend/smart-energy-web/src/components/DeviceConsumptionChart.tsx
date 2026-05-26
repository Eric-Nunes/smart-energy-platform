import { useState } from 'react'
import type { EnergyConsumptionPoint } from '../services/energyService'

type ResidenceOption = {
  id: string
  name: string
  rooms: string[]
}

type ManagedDevice = {
  id: string
  device: string
  room: string
  residenceId: string
  smartPlugName: string
  consumption: number
  history: EnergyConsumptionPoint[]
}

type DeviceConsumptionChartProps = {
  data: ManagedDevice[]
  pricePerKwh: number
  residences: ResidenceOption[]
  onUpdateDevice: (deviceId: string, updates: Partial<ManagedDevice>) => void
  onDeleteDevice: (deviceId: string) => void
}

export default function DeviceConsumptionChart({
  data,
  pricePerKwh,
  residences,
  onUpdateDevice,
  onDeleteDevice,
}: DeviceConsumptionChartProps) {
  const [expandedId, setExpandedId] = useState<string | null>(data[0]?.id ?? null)
  const total = data.reduce((sum, item) => sum + item.consumption, 0)
  const maxValue = Math.max(...data.map((item) => item.consumption), 1)

  return (
    <div className="device-chart-list">
      {data.map((item) => {
        const percentage = total ? (item.consumption / total) * 100 : 0
        const barWidth = (item.consumption / maxValue) * 100
        const residence = residences.find((option) => option.id === item.residenceId)
        const isExpanded = expandedId === item.id

        return (
          <article className="device-row" key={item.id}>
            <button className="device-row-toggle" onClick={() => setExpandedId(isExpanded ? null : item.id)} type="button">
              <div className="device-row-header">
                <strong>{item.device}</strong>
                <span>{item.consumption.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kWh</span>
              </div>

              <div className="device-bar" aria-hidden="true">
                <span style={{ width: `${barWidth}%` }} />
              </div>

              <div className="device-row-footer">
                <span>{percentage.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do total</span>
                <span>{(item.consumption * pricePerKwh).toLocaleString('pt-BR', { currency: 'BRL', style: 'currency' })}</span>
              </div>
            </button>

            {isExpanded && (
              <div className="device-details">
                <div className="form-grid two-columns">
                  <label>
                    Nome do produto
                    <input onChange={(event) => onUpdateDevice(item.id, { device: event.target.value })} type="text" value={item.device} />
                  </label>
                  <label>
                    Nome da smart plug
                    <input onChange={(event) => onUpdateDevice(item.id, { smartPlugName: event.target.value })} type="text" value={item.smartPlugName} />
                  </label>
                  <label>
                    Residência
                    <select
                      onChange={(event) => {
                        const nextResidence = residences.find((option) => option.id === event.target.value)
                        onUpdateDevice(item.id, {
                          residenceId: event.target.value,
                          room: nextResidence?.rooms[0] ?? '',
                        })
                      }}
                      value={item.residenceId}
                    >
                      {residences.map((option) => (
                        <option key={option.id} value={option.id}>{option.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Cômodo
                    <select onChange={(event) => onUpdateDevice(item.id, { room: event.target.value })} value={item.room}>
                      {(residence?.rooms ?? []).map((room) => (
                        <option key={room} value={room}>{room}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="device-history">
                  <strong>Histórico do dispositivo</strong>
                  <div className="device-history-list">
                    {item.history.map((point) => (
                      <div className="device-history-card" key={`${item.id}-${point.label}`}>
                        <span>{point.label}</span>
                        <strong>{point.consumption.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kWh</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="device-actions">
                  <button className="danger-action" onClick={() => onDeleteDevice(item.id)} type="button">Excluir dispositivo</button>
                </div>
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}
