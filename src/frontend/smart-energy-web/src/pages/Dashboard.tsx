import { useEffect, useMemo, useState } from 'react'
import AlertsPage from './AlertsPage'
import DeviceConsumptionChart from '../components/DeviceConsumptionChart'
import EnergyChart from '../components/EnergyChart'
import GoalsPage from './GoalsPage'
import HistoryPage from './HistoryPage'
import ProfilePage from './ProfilePage'
import SettingsPage from './SettingsPage'
import {
  getDeviceConsumption,
  getEnergyConsumption,
  type EnergyConsumptionPoint,
  type EnergyPeriod,
  type ManagedDevice,
  type ResidenceUnit,
} from '../services/energyService'
import {
  getEnergyTariff,
  stateOptions,
  type BrazilianStateCode,
  type EnergyTariff,
  type TariffFlag,
} from '../services/tariffService'

type ActivePage = 'dashboard' | 'profile' | 'history' | 'goals' | 'alerts' | 'settings'

type DeviceFormState = {
  device: string
  smartPlugName: string
  residenceId: string
  room: string
}

type SettingsState = {
  defaultState: BrazilianStateCode
  manualTariff: string
  monthlyGoal: string
  automaticSync: boolean
  readingInterval: string
}

const periodOptions: Array<{ label: string; value: EnergyPeriod }> = [
  { label: 'Dia', value: 'day' },
  { label: 'Semana', value: 'week' },
  { label: 'Mês', value: 'month' },
  { label: 'Ano', value: 'year' },
]

const periodLabels: Record<EnergyPeriod, string> = {
  day: 'visão hora a hora do dia',
  week: 'comparação entre dias da semana',
  month: 'consumo consolidado por semana',
  year: 'evolução mensal do ano',
}

const initialUnits: ResidenceUnit[] = [
  {
    id: 'unit-main',
    name: 'Residência principal',
    state: 'SP',
    city: 'São Paulo',
    residents: 4,
    rooms: [
      { id: 'room-1', name: 'Sala' },
      { id: 'room-2', name: 'Cozinha' },
      { id: 'room-3', name: 'Suíte' },
      { id: 'room-4', name: 'Escritório' },
      { id: 'room-5', name: 'Banheiro social' },
    ],
  },
  {
    id: 'unit-beach',
    name: 'Casa de praia',
    state: 'SP',
    city: 'Santos',
    residents: 2,
    rooms: [
      { id: 'room-6', name: 'Varanda' },
      { id: 'room-7', name: 'Sala integrada' },
      { id: 'room-8', name: 'Quarto hóspedes' },
    ],
  },
]

const initialSettings: SettingsState = {
  defaultState: 'SP',
  manualTariff: '0,91',
  monthlyGoal: '320',
  automaticSync: true,
  readingInterval: '15',
}

function getConsumptionLevel(total: number, period: EnergyPeriod) {
  const limits: Record<EnergyPeriod, { medium: number; high: number }> = {
    day: { medium: 12, high: 18 },
    week: { medium: 95, high: 125 },
    month: { medium: 330, high: 430 },
    year: { medium: 3200, high: 3900 },
  }

  if (total >= limits[period].high) {
    return { className: 'high', label: 'Alto', description: 'acima do esperado' }
  }

  if (total >= limits[period].medium) {
    return { className: 'medium', label: 'Moderado', description: 'merece atenção' }
  }

  return { className: 'low', label: 'Eficiente', description: 'faixa saudável' }
}

function createNewDevice(period: EnergyPeriod, form: DeviceFormState): ManagedDevice {
  const baseConsumption: Record<EnergyPeriod, number> = {
    day: 1.2,
    week: 8.4,
    month: 34,
    year: 408,
  }

  const historyTemplates: Record<EnergyPeriod, EnergyConsumptionPoint[]> = {
    day: [
      { label: '00h-06h', consumption: 0.2 },
      { label: '06h-12h', consumption: 0.3 },
      { label: '12h-18h', consumption: 0.3 },
      { label: '18h-23h', consumption: 0.4 },
    ],
    week: [
      { label: 'Seg', consumption: 1.1 },
      { label: 'Ter', consumption: 1.2 },
      { label: 'Qua', consumption: 1.1 },
      { label: 'Qui', consumption: 1.3 },
      { label: 'Sex', consumption: 1.2 },
      { label: 'Sáb', consumption: 1.3 },
      { label: 'Dom', consumption: 1.2 },
    ],
    month: [
      { label: 'Semana 1', consumption: 8.1 },
      { label: 'Semana 2', consumption: 8.5 },
      { label: 'Semana 3', consumption: 8.4 },
      { label: 'Semana 4', consumption: 9 },
    ],
    year: [
      { label: '1º tri', consumption: 94 },
      { label: '2º tri', consumption: 98 },
      { label: '3º tri', consumption: 103 },
      { label: '4º tri', consumption: 113 },
    ],
  }

  return {
    id: `device-${Date.now()}`,
    device: form.device,
    smartPlugName: form.smartPlugName,
    residenceId: form.residenceId,
    room: form.room,
    consumption: baseConsumption[period],
    history: historyTemplates[period],
  }
}

function getFlagLabel(flag: TariffFlag) {
  if (flag === 'verde') return 'Bandeira verde'
  if (flag === 'amarela') return 'Bandeira amarela'
  return 'Bandeira vermelha'
}

export default function Dashboard() {
  const [activePage, setActivePage] = useState<ActivePage>('dashboard')
  const [period, setPeriod] = useState<EnergyPeriod>('day')
  const [units, setUnits] = useState<ResidenceUnit[]>(initialUnits)
  const [selectedUnitId, setSelectedUnitId] = useState(initialUnits[0].id)
  const [selectedState, setSelectedState] = useState<BrazilianStateCode>('SP')
  const [settings, setSettings] = useState<SettingsState>(initialSettings)
  const [data, setData] = useState<EnergyConsumptionPoint[]>([])
  const [deviceData, setDeviceData] = useState<ManagedDevice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [source, setSource] = useState<'api' | 'fallback'>('fallback')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [tariff, setTariff] = useState<EnergyTariff | null>(null)
  const [deviceForm, setDeviceForm] = useState<DeviceFormState>({
    device: '',
    smartPlugName: '',
    residenceId: initialUnits[0].id,
    room: initialUnits[0].rooms[0]?.name ?? '',
  })

  const selectedUnit = units.find((unit) => unit.id === selectedUnitId) ?? units[0]
  const activeDeviceResidence = units.find((unit) => unit.id === deviceForm.residenceId) ?? units[0]
  const availableDeviceRooms = activeDeviceResidence?.rooms ?? []
  const selectedDeviceRoom = availableDeviceRooms.some((room) => room.name === deviceForm.room)
    ? deviceForm.room
    : availableDeviceRooms[0]?.name ?? ''

  useEffect(() => {
    let isCurrentRequest = true

    async function loadData() {
      setIsLoading(true)
      const [consumptionResult, deviceResult] = await Promise.all([
        getEnergyConsumption(period),
        getDeviceConsumption(period),
      ])

      if (isCurrentRequest) {
        setData(consumptionResult.data)
        setDeviceData(deviceResult.data)
        setSource(consumptionResult.source)
        setIsLoading(false)
      }
    }

    loadData()

    return () => {
      isCurrentRequest = false
    }
  }, [period])

  useEffect(() => {
    let isCurrentRequest = true

    async function loadTariff() {
      const result = await getEnergyTariff(selectedState)

      if (isCurrentRequest) {
        setTariff(result)
      }
    }

    loadTariff()

    return () => {
      isCurrentRequest = false
    }
  }, [selectedState])

  const metrics = useMemo(() => {
    const total = data.reduce((sum, item) => sum + item.consumption, 0)
    const average = data.length ? total / data.length : 0
    const peak = data.reduce<EnergyConsumptionPoint | null>(
      (currentPeak, item) =>
        !currentPeak || item.consumption > currentPeak.consumption ? item : currentPeak,
      null,
    )

    const pricePerKwh = tariff?.pricePerKwh ?? 0
    const estimatedCost = total * pricePerKwh

    return { total, average, peak, estimatedCost, pricePerKwh }
  }, [data, tariff])

  const consumptionLevel = getConsumptionLevel(metrics.total, period)
  const residenceOptions = units.map((unit) => ({
    id: unit.id,
    name: unit.name,
    rooms: unit.rooms.map((room) => room.name),
  }))

  function navigateTo(page: ActivePage) {
    setActivePage(page)
    setIsMenuOpen(false)
  }

  function handleUpdateUnit(unitId: string, updates: Partial<Omit<ResidenceUnit, 'rooms'>>) {
    setUnits((current) =>
      current.map((unit) => (unit.id === unitId ? { ...unit, ...updates } : unit)),
    )
  }

  function handleAddUnit() {
    const nextUnit: ResidenceUnit = {
      id: `unit-${Date.now()}`,
      name: `Nova residência ${units.length + 1}`,
      state: 'SP',
      city: '',
      residents: 1,
      rooms: [{ id: `room-${Date.now()}`, name: 'Novo cômodo' }],
    }

    setUnits((current) => [...current, nextUnit])
    setSelectedUnitId(nextUnit.id)
    setSelectedState(nextUnit.state as BrazilianStateCode)
  }

  function handleAddRoom(unitId: string) {
    setUnits((current) =>
      current.map((unit) =>
        unit.id === unitId
          ? {
              ...unit,
              rooms: [
                ...unit.rooms,
                { id: `room-${Date.now()}`, name: `Cômodo ${unit.rooms.length + 1}` },
              ],
            }
          : unit,
      ),
    )
  }

  function handleUpdateRoom(unitId: string, roomId: string, name: string) {
    setUnits((current) =>
      current.map((unit) =>
        unit.id === unitId
          ? {
              ...unit,
              rooms: unit.rooms.map((room) => (room.id === roomId ? { ...room, name } : room)),
            }
          : unit,
      ),
    )
  }

  function handleSelectUnit(unitId: string) {
    setSelectedUnitId(unitId)
    const nextUnit = units.find((unit) => unit.id === unitId)

    if (nextUnit && stateOptions.some((state) => state.value === nextUnit.state)) {
      setSelectedState(nextUnit.state as BrazilianStateCode)
    }
  }

  function handleAddDevice() {
    if (!deviceForm.device.trim() || !deviceForm.smartPlugName.trim()) {
      return
    }

    setDeviceData((current) => [
      ...current,
      createNewDevice(period, { ...deviceForm, room: selectedDeviceRoom }),
    ])

    setDeviceForm({
      device: '',
      smartPlugName: '',
      residenceId: selectedUnitId,
      room: selectedUnit?.rooms[0]?.name ?? '',
    })
  }

  function handleUpdateDevice(deviceId: string, updates: Partial<ManagedDevice>) {
    setDeviceData((current) =>
      current.map((item) => (item.id === deviceId ? { ...item, ...updates } : item)),
    )
  }

  function handleDeleteDevice(deviceId: string) {
    setDeviceData((current) => current.filter((item) => item.id !== deviceId))
  }

  function handleSaveProfile() {
    setSelectedState((selectedUnit?.state as BrazilianStateCode) ?? 'SP')
  }

  function renderActivePage() {
    if (activePage === 'profile') {
      return (
        <ProfilePage
          onAddRoom={handleAddRoom}
          onAddUnit={handleAddUnit}
          onSave={handleSaveProfile}
          onSelectUnit={handleSelectUnit}
          onUpdateRoom={handleUpdateRoom}
          onUpdateUnit={handleUpdateUnit}
          selectedUnit={selectedUnit}
          selectedUnitId={selectedUnitId}
          units={units}
        />
      )
    }

    if (activePage === 'history') {
      return <HistoryPage />
    }

    if (activePage === 'goals') {
      return <GoalsPage />
    }

    if (activePage === 'alerts') {
      return <AlertsPage />
    }

    if (activePage === 'settings') {
      return <SettingsPage onSettingsChange={setSettings} settings={settings} />
    }

    return (
      <>
        <section className="dashboard-header">
          <div>
            <div className="brand-row">
              <img src="/smart-energy-logo.avif" alt="Smart Energy Platform" />
              <p className="eyebrow">Smart Energy Platform</p>
            </div>
            <h1>Consumo de energia residencial</h1>
            <p className="header-copy">
              Visão clara do consumo, do custo estimado e dos dispositivos que mais pesam na conta.
            </p>
          </div>

          <div className="status-panel">
            <span className={source === 'api' ? 'status-dot online' : 'status-dot'} />
            <div>
              <strong>{source === 'api' ? 'API conectada' : 'Dados demonstrativos'}</strong>
              <span>{source === 'api' ? 'Backend .NET respondendo' : 'Aguardando endpoint real'}</span>
            </div>
          </div>
        </section>

        <section className="metrics-grid" aria-label="Resumo de consumo">
          <article>
            <span>Consumo total</span>
            <strong>{metrics.total.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kWh</strong>
          </article>
          <article>
            <span>Gasto estimado</span>
            <strong>
              {metrics.estimatedCost.toLocaleString('pt-BR', {
                currency: 'BRL',
                style: 'currency',
              })}
            </strong>
          </article>
          <article>
            <span>Média do período</span>
            <strong>{metrics.average.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kWh</strong>
          </article>
          <article>
            <span>Maior pico</span>
            <strong>
              {metrics.peak
                ? `${metrics.peak.consumption.toLocaleString('pt-BR', {
                    maximumFractionDigits: 1,
                  })} kWh`
                : '0 kWh'}
            </strong>
          </article>
          <article className={`level-card ${consumptionLevel.className}`}>
            <span>Nível de consumo</span>
            <strong>{consumptionLevel.label}</strong>
            <small>{consumptionLevel.description}</small>
          </article>
        </section>

        <section className="chart-section">
          <div className="section-heading">
            <div>
              <h2>Comparativo de consumo</h2>
              <p>{periodLabels[period]}</p>
            </div>
            <div className="chart-actions">
              <div className="tariff-compact">
                <div>
                  <span>Cotação</span>
                  <strong>
                    {metrics.pricePerKwh.toLocaleString('pt-BR', {
                      currency: 'BRL',
                      style: 'currency',
                    })}
                    /kWh
                  </strong>
                  <small className={`flag-badge ${tariff?.flag ?? 'verde'}`}>
                    <i className="flag-dot" />
                    {getFlagLabel(tariff?.flag ?? 'verde')}
                  </small>
                </div>
                <label>
                  Estado
                  <select
                    onChange={(event) => setSelectedState(event.target.value as BrazilianStateCode)}
                    value={selectedState}
                  >
                    {stateOptions.map((state) => (
                      <option key={state.value} value={state.value}>
                        {state.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <section className="period-tabs" aria-label="Selecionar período">
                {periodOptions.map((option) => (
                  <button
                    className={period === option.value ? 'active' : ''}
                    key={option.value}
                    onClick={() => setPeriod(option.value)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </section>
              {isLoading && <span className="loading-pill">Carregando</span>}
            </div>
          </div>

          <EnergyChart data={data} pricePerKwh={metrics.pricePerKwh} />
        </section>

        <section className="chart-section">
          <div className="section-heading">
            <div>
              <h2>Cadastro de dispositivos</h2>
              <p>Associe produtos e smart plugs a uma residência e a um cômodo.</p>
            </div>
          </div>

          <div className="device-registration-grid">
            <label>
              Produto
              <input
                onChange={(event) =>
                  setDeviceForm((current) => ({ ...current, device: event.target.value }))
                }
                placeholder="Ex.: Cafeteira"
                type="text"
                value={deviceForm.device}
              />
            </label>
            <label>
              Smart plug
              <input
                onChange={(event) =>
                  setDeviceForm((current) => ({ ...current, smartPlugName: event.target.value }))
                }
                placeholder="Ex.: Plug cozinha 02"
                type="text"
                value={deviceForm.smartPlugName}
              />
            </label>
            <label>
              Residência
              <select
                onChange={(event) => {
                  const nextUnit = units.find((unit) => unit.id === event.target.value)
                  setDeviceForm((current) => ({
                    ...current,
                    residenceId: event.target.value,
                    room: nextUnit?.rooms[0]?.name ?? '',
                  }))
                }}
                value={deviceForm.residenceId}
              >
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Cômodo
              <select
                onChange={(event) =>
                  setDeviceForm((current) => ({ ...current, room: event.target.value }))
                }
                value={selectedDeviceRoom}
              >
                {availableDeviceRooms.map((room) => (
                  <option key={room.id} value={room.name}>
                    {room.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="primary-action full-width" onClick={handleAddDevice} type="button">
              + Adicionar dispositivo
            </button>
          </div>
        </section>

        <section className="chart-section">
          <div className="section-heading">
            <div>
              <h2>Consumo por dispositivo</h2>
              <p>Clique em um dispositivo para ver o histórico, editar os dados ou excluir.</p>
            </div>
          </div>

          <DeviceConsumptionChart
            data={deviceData}
            onDeleteDevice={handleDeleteDevice}
            onUpdateDevice={handleUpdateDevice}
            pricePerKwh={metrics.pricePerKwh}
            residences={residenceOptions}
          />
        </section>
      </>
    )
  }

  return (
    <div className="app-shell">
      <aside className={isMenuOpen ? 'sidebar open' : 'sidebar'}>
        <div className="sidebar-brand">
          <img src="/smart-energy-logo.avif" alt="Smart Energy Platform" />
          <div>
            <strong>Smart Energy</strong>
            <span>Residencial</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Menu principal">
          <button
            className={activePage === 'dashboard' ? 'active' : ''}
            onClick={() => navigateTo('dashboard')}
            type="button"
          >
            Dashboard
          </button>
          <button
            className={activePage === 'profile' ? 'active' : ''}
            onClick={() => navigateTo('profile')}
            type="button"
          >
            Seu perfil
          </button>
          <button
            className={activePage === 'history' ? 'active' : ''}
            onClick={() => navigateTo('history')}
            type="button"
          >
            Histórico de consumo
          </button>
          <button
            className={activePage === 'goals' ? 'active' : ''}
            onClick={() => navigateTo('goals')}
            type="button"
          >
            Metas e cotas
          </button>
          <button
            className={activePage === 'alerts' ? 'active' : ''}
            onClick={() => navigateTo('alerts')}
            type="button"
          >
            Alertas
          </button>
          <button
            className={activePage === 'settings' ? 'active' : ''}
            onClick={() => navigateTo('settings')}
            type="button"
          >
            Configurações
          </button>
        </nav>
      </aside>

      {isMenuOpen && (
        <button
          aria-label="Fechar menu"
          className="sidebar-backdrop"
          onClick={() => setIsMenuOpen(false)}
          type="button"
        />
      )}

      <div className="workspace">
        <div className="menu-rail">
          <button
            aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            className="menu-button"
            onClick={() => setIsMenuOpen((current) => !current)}
            type="button"
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        <main className="dashboard">
          <section className="topbar">
            <div className="topbar-spacer" />
            <div className="topbar-actions unit-picker">
              <label>
                Local selecionado
                <select onChange={(event) => handleSelectUnit(event.target.value)} value={selectedUnitId}>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {renderActivePage()}
        </main>
      </div>
    </div>
  )
}
