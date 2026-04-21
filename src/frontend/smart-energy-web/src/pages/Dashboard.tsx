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
  type DeviceConsumptionPoint,
  type EnergyConsumptionPoint,
  type EnergyPeriod,
} from '../services/energyService'
import {
  getEnergyTariff,
  stateOptions,
  type BrazilianStateCode,
  type EnergyTariff,
} from '../services/tariffService'

type ActivePage = 'dashboard' | 'profile' | 'history' | 'goals' | 'alerts' | 'settings'

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

function getConsumptionLevel(total: number, period: EnergyPeriod) {
  const limits: Record<EnergyPeriod, { medium: number; high: number }> = {
    day: { medium: 12, high: 18 },
    week: { medium: 95, high: 125 },
    month: { medium: 330, high: 430 },
    year: { medium: 3200, high: 3900 },
  }

  if (total >= limits[period].high) {
    return {
      className: 'high',
      label: 'Alto',
      description: 'acima do esperado',
    }
  }

  if (total >= limits[period].medium) {
    return {
      className: 'medium',
      label: 'Moderado',
      description: 'merece atenção',
    }
  }

  return {
    className: 'low',
    label: 'Eficiente',
    description: 'faixa saudável',
  }
}

export default function Dashboard() {
  const [activePage, setActivePage] = useState<ActivePage>('dashboard')
  const [period, setPeriod] = useState<EnergyPeriod>('day')
  const [unitName, setUnitName] = useState('Residência principal')
  const [selectedState, setSelectedState] = useState<BrazilianStateCode>('SP')
  const [data, setData] = useState<EnergyConsumptionPoint[]>([])
  const [deviceData, setDeviceData] = useState<DeviceConsumptionPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [source, setSource] = useState<'api' | 'fallback'>('fallback')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [tariff, setTariff] = useState<EnergyTariff | null>(null)

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

  function navigateTo(page: ActivePage) {
    setActivePage(page)
    setIsMenuOpen(false)
  }

  function renderActivePage() {
    if (activePage === 'profile') {
      return <ProfilePage onUnitNameChange={setUnitName} unitName={unitName} />
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
      return <SettingsPage />
    }

    return (
      <>
        <section className="dashboard-header">
          <div>
            <div className="brand-row">
              <img src="/smart-energy-logo.avif" alt="Smart Energy Platform" />
              <p className="eyebrow">Smart Energy Platform</p>
            </div>
            <h1>Consumo residencial</h1>
            <p className="header-copy">
              Visão objetiva do consumo, custos estimados e picos por período.
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
            <strong>
              {metrics.average.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kWh
            </strong>
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
              <div className="level-legend" aria-label="Legenda de consumo">
                <span>
                  <i className="low" /> Baixo
                </span>
                <span>
                  <i className="medium" /> Moderado
                </span>
                <span>
                  <i className="high" /> Alto
                </span>
              </div>
              {isLoading && <span className="loading-pill">Carregando</span>}
            </div>
          </div>

          <EnergyChart data={data} pricePerKwh={metrics.pricePerKwh} />
        </section>

        <section className="chart-section">
          <div className="section-heading">
            <div>
              <h2>Consumo por dispositivo</h2>
              <p>Distribuição estimada por smart plug conectada</p>
            </div>
          </div>

          <DeviceConsumptionChart data={deviceData} pricePerKwh={metrics.pricePerKwh} />
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

      <main className="dashboard">
        <section className="topbar">
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

          <div className="topbar-actions">
            <span>{unitName}</span>
          </div>
        </section>

        {renderActivePage()}
      </main>
    </div>
  )
}
