import { useEffect, useState, type ChangeEvent } from 'react'
import AlertsPage from './AlertsPage'
import DeviceConsumptionChart from '../components/DeviceConsumptionChart'
import DevicesPage from './DevicesPage'
import EnergyChart from '../components/EnergyChart'
import GoalsPage from './GoalsPage'
import HistoryPage from './HistoryPage'
import SettingsPage from './SettingsPage'
import {
  getDeviceConsumption,
  getCurrentMonitoredDevice,
  getEnergyHistory,
  getLatestMeasurementsByDevice,
  getProgressoMensal,
  selectDeviceForMonitoring,
  type DeviceConsumptionPoint,
  type CombinedEnergyHistory,
  type LatestMeasurementByDevice,
  type ProgressoMensal,
} from '../services/energyService'

type ActivePage = 'dashboard' | 'history' | 'goals' | 'alerts' | 'settings' | 'devices'

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Ocorreu um erro inesperado ao consultar a API.'
}

export default function Dashboard() {
  const [activePage, setActivePage] = useState<ActivePage>('dashboard')
  const [unitName] = useState('Residência principal')
  const [devices, setDevices] = useState<DeviceConsumptionPoint[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null)
  const [history, setHistory] = useState<CombinedEnergyHistory | null>(null)
  const [isLoadingDevices, setIsLoadingDevices] = useState(true)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [isSelectingDevice, setIsSelectingDevice] = useState(false)
  const [selectionMessage, setSelectionMessage] = useState<string | null>(null)
  const [selectionError, setSelectionError] = useState<string | null>(null)
  const [latestMeasurements, setLatestMeasurements] = useState<LatestMeasurementByDevice[]>([])
  const [latestMeasurementError, setLatestMeasurementError] = useState<string | null>(null)
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [historyPeriod, setHistoryPeriod] = useState<'all' | 'hour' | 'today' | '7days' | 'month'>('all')
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)
  const [historyReferenceTime, setHistoryReferenceTime] = useState<number | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [monthlyProgress, setMonthlyProgress] = useState<ProgressoMensal | null>(null)
  const [monthlyProgressError, setMonthlyProgressError] = useState<string | null>(null)
  const [monthlyDeviceConsumption, setMonthlyDeviceConsumption] = useState<DeviceConsumptionPoint[]>([])
  const [isLoadingMonthlyProgress, setIsLoadingMonthlyProgress] = useState(false)


  useEffect(() => {
    let isCurrentRequest = true

    async function loadDevices() {
      setIsLoadingDevices(true)
      setApiError(null)

      try {
        const [result, currentDevice] = await Promise.all([
          getDeviceConsumption(),
          getCurrentMonitoredDevice(),
        ])
        if (!isCurrentRequest) return

        setDevices(result)
        // Reflete a seleção real mantida pelo backend; não escolhe um aparelho automaticamente.
        setSelectedDeviceId(
          currentDevice && result.some((item) => item.aparelhoId === currentDevice.aparelhoId)
            ? currentDevice.aparelhoId
            : null,
        )
      } catch (error) {
        if (!isCurrentRequest) return
        setDevices([])
        setSelectedDeviceId(null)
        setApiError(getErrorMessage(error))
      } finally {
        if (isCurrentRequest) setIsLoadingDevices(false)
      }
    }

    void loadDevices()
    return () => {
      isCurrentRequest = false
    }
  }, [])

  // Atualiza consumo e custo por aparelho sem recarregar a página.
  // A consulta seguinte só começa depois que a anterior termina.
  useEffect(() => {
    if (activePage !== 'dashboard') return

    let isMounted = true
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    async function refreshDeviceConsumption() {
      try {
        const result = await getDeviceConsumption()
        if (!isMounted) return

        setDevices(result)
        setApiError(null)
      } catch (error) {
        if (!isMounted) return
        setApiError(getErrorMessage(error))
      } finally {
        if (isMounted) {
          timeoutId = setTimeout(() => {
            void refreshDeviceConsumption()
          }, 5000)
        }
      }
    }

    timeoutId = setTimeout(() => {
      void refreshDeviceConsumption()
    }, 5000)

    return () => {
      isMounted = false
      if (timeoutId !== undefined) clearTimeout(timeoutId)
    }
  }, [activePage])

  // Atualiza a última leitura individual de cada aparelho a cada 5 segundos.
  useEffect(() => {
    if (activePage !== 'dashboard') return

    let isMounted = true
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    async function loadLatestMeasurements() {
      try {
        const result = await getLatestMeasurementsByDevice()
        if (!isMounted) return

        setLatestMeasurements(result)
        setLatestMeasurementError(null)
        setLastCheckedAt(new Date())
        setNow(Date.now())
      } catch (error) {
        if (!isMounted) return
        setLatestMeasurementError(getErrorMessage(error))
        setLastCheckedAt(new Date())
        setNow(Date.now())
      } finally {
        if (isMounted) {
          timeoutId = setTimeout(() => {
            void loadLatestMeasurements()
          }, 5000)
        }
      }
    }

    void loadLatestMeasurements()

    return () => {
      isMounted = false
      if (timeoutId !== undefined) clearTimeout(timeoutId)
    }
  }, [activePage])

  useEffect(() => {
    if (activePage !== 'dashboard') return
    const timerId = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(timerId)
  }, [activePage])

  /*
  // Atualiza os históricos mensal e consolidado periodicamente, além do botão manual.
  useEffect(() => {
    if (activePage !== 'dashboard') return
    const timerId = setInterval(() => {
      setHistoryRefreshKey((current) => current + 1)
    }, 60000)
    return () => clearInterval(timerId)
  }, [activePage])*/

  // Consulta o histórico individual de cada aparelho uma única vez por atualização.
  // A partir dele, monta tanto o histórico consolidado quanto o consumo do mês atual.
  const deviceIdsKey = devices.map((device) => device.aparelhoId).join(',')
  const currentDate = new Date(now)
  const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`

  useEffect(() => {
    if (activePage !== 'dashboard' || isLoadingDevices) return

    let isCurrentRequest = true
    const aparelhoIds = deviceIdsKey
      ? deviceIdsKey.split(',').map((id) => Number(id))
      : []

    async function loadHistories() {
      if (aparelhoIds.length === 0) {
        setHistory(null)
        setMonthlyDeviceConsumption([])
        setHistoryError(null)
        setIsLoadingHistory(false)
        return
      }

      setIsLoadingHistory(true)
      setHistoryError(null)

      try {
        const histories = await Promise.all(aparelhoIds.map((id) => getEnergyHistory(id)))
        if (!isCurrentRequest) return

        const combinedHistory: CombinedEnergyHistory = {
          quantidadeMedicoes: histories.reduce((total, item) => total + item.quantidadeMedicoes, 0),
          quantidadeIntervalosValidos: histories.reduce(
            (total, item) => total + item.quantidadeIntervalosValidos,
            0,
          ),
          historico: histories
            .flatMap((item) => item.historico)
            .sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime()),
        }
        setHistory(combinedHistory)
        setHistoryReferenceTime(Date.now())

        const [yearText, monthText] = currentMonthKey.split('-')
        const targetYear = Number(yearText)
        const targetMonth = Number(monthText) - 1
        const tariff = monthlyProgress?.tarifaKwh ?? 0

        const monthlyItems = histories.map((item) => {
          const validMonthlyIntervals = item.historico.filter((point) => {
            const date = new Date(point.dataHora)
            return !Number.isNaN(date.getTime()) &&
              date.getFullYear() === targetYear &&
              date.getMonth() === targetMonth
          })
          const consumption = validMonthlyIntervals.reduce(
            (total, point) => total + point.consumption,
            0,
          )
          const device = devices.find((registered) => registered.aparelhoId === item.aparelhoId)

          return {
            aparelhoId: item.aparelhoId,
            device: device?.device ?? item.nomeAparelho,
            consumption,
            estimatedCost: consumption * tariff,
            measurementCount: validMonthlyIntervals.length,
          }
        })

        setMonthlyDeviceConsumption(monthlyItems)
      } catch (error) {
        if (isCurrentRequest) {
          setHistory(null)
          setMonthlyDeviceConsumption([])
          setHistoryError(getErrorMessage(error))
        }
      } finally {
        if (isCurrentRequest) setIsLoadingHistory(false)
      }
    }

    void loadHistories()
    return () => {
      isCurrentRequest = false
    }
  }, [activePage, deviceIdsKey, historyRefreshKey, isLoadingDevices, currentMonthKey])

  // Recalcula somente os custos exibidos quando a tarifa muda,
  // sem consultar novamente o histórico de medições.
  useEffect(() => {
    const tarifa = monthlyProgress?.tarifaKwh ?? 0

    setMonthlyDeviceConsumption((current) =>
      current.map((item) => ({
        ...item,
        estimatedCost: item.consumption * tarifa,
      })),
    )
  }, [monthlyProgress?.tarifaKwh])

  useEffect(() => {
    if (activePage !== 'dashboard') return

    let isMounted = true
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    async function refreshMonthlyProgress() {
      setIsLoadingMonthlyProgress(true)

      try {
        const result = await getProgressoMensal()

        if (!isMounted) return

        setMonthlyProgress(result)
        setMonthlyProgressError(null)
      } catch (error) {
        if (!isMounted) return

        setMonthlyProgressError(getErrorMessage(error))
      } finally {
        if (isMounted) {
          setIsLoadingMonthlyProgress(false)

          timeoutId = setTimeout(() => {
            void refreshMonthlyProgress()
          }, 5000)
        }
      }
    }

    void refreshMonthlyProgress()

    return () => {
      isMounted = false
      if (timeoutId !== undefined) clearTimeout(timeoutId)
    }
  }, [activePage])



  async function handleDeviceSelection(event: ChangeEvent<HTMLSelectElement>) {
    const aparelhoId = Number(event.target.value)
    if (!Number.isInteger(aparelhoId) || aparelhoId <= 0) return

    setIsSelectingDevice(true)
    setSelectionError(null)
    setSelectionMessage(null)

    try {
      await selectDeviceForMonitoring(aparelhoId)
      setSelectedDeviceId(aparelhoId)
      const aparelho = devices.find((item) => item.aparelhoId === aparelhoId)
      setSelectionMessage(
        aparelho
          ? `${aparelho.device} selecionado. As próximas medições serão associadas a ele.`
          : 'Aparelho selecionado para monitoramento.',
      )
    } catch (error) {
      setSelectionError(getErrorMessage(error))
    } finally {
      setIsSelectingDevice(false)
    }
  }

  const selectedDevice = devices.find((item) => item.aparelhoId === selectedDeviceId) ?? null

  function navigateTo(page: ActivePage) {
    setActivePage(page)
    setIsMenuOpen(false)
  }

  function renderActivePage() {
    if (activePage === 'history') return <HistoryPage />
    if (activePage === 'goals') return <GoalsPage />
    if (activePage === 'alerts') return <AlertsPage />
    if (activePage === 'settings') return <SettingsPage />
    if (activePage === 'devices') return <DevicesPage />

    return (
      <>
        <section className="dashboard-header">
          <div>
            <div className="brand-row">
              <img src="/smart-energy-logo.avif" alt="Smart Energy Platform" />
              <p className="eyebrow">Smart Energy Platform</p>
            </div>
            <h1>Consumo dos aparelhos monitorados</h1>
            <p className="header-copy">
              Consumo calculado pela potência média e pelo intervalo real entre medições válidas.
            </p>
          </div>

          <div className="status-panel">
            <span className={apiError ? 'status-dot' : 'status-dot online'} />
            <div>
              <strong>{apiError ? 'Falha na conexão' : 'API de consumo'}</strong>
              <span>{apiError ?? (isLoadingDevices ? 'Consultando backend .NET' : 'Dados recebidos do backend .NET')}</span>
            </div>
          </div>
        </section>

        <section className="metrics-grid" aria-label="Resumo do consumo no mês atual">
          <article>
            <span>Consumo no mês atual</span>
            <strong>
              {monthlyProgress
                ? `${monthlyProgress.consumoMensalKwh.toLocaleString('pt-BR', { maximumFractionDigits: 6 })} kWh`
                : '—'}
            </strong>
          </article>
          <article>
            <span>Custo estimado no mês atual</span>
            <strong>
              {monthlyProgress
                ? monthlyProgress.custoMensalReais.toLocaleString('pt-BR', {
                    currency: 'BRL',
                    style: 'currency',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  })
                : '—'}
            </strong>
          </article>
          <article>
            <span>Aparelhos cadastrados</span>
            <strong>{devices.length}</strong>
          </article>
          <article>
            <span>Intervalos válidos no mês</span>
            <strong>{monthlyProgress?.quantidadeIntervalosValidos.toLocaleString('pt-BR') ?? '—'}</strong>
          </article>
        </section>

        <section className="chart-section monthly-goals-summary">
          <div className="section-heading">
            <div>
              <h2>Metas mensais da residência</h2>
              <p>
                Acompanhamento do consumo e do custo calculados no mês atual.
              </p>
            </div>

            {monthlyProgress && (
              <span className="goals-interval-count">
                {monthlyProgress.quantidadeIntervalosValidos.toLocaleString('pt-BR')}
                {' '}intervalos válidos
              </span>
            )}
          </div>

          {isLoadingMonthlyProgress && !monthlyProgress && (
            <p className="loading-pill">Carregando progresso mensal...</p>
          )}

          {monthlyProgressError && (
            <p className="error-message">
              Não foi possível atualizar as metas mensais: {monthlyProgressError}
            </p>
          )}

          {monthlyProgress && (
            <>
              {!monthlyProgress.metaConfigurada ||
              monthlyProgress.metaConsumoKwh == null ||
              monthlyProgress.metaCustoReais == null ||
              monthlyProgress.percentualConsumo == null ||
              monthlyProgress.percentualCusto == null ? (
                <p className="empty-state">
                  As metas deste mês ainda não foram configuradas.
                  Acesse Configurações para definir os limites da residência.
                </p>
              ) : (
                <div className="monthly-goals-grid">
                  <article className="monthly-goal-card">
                    <div className="monthly-goal-heading">
                      <span>Consumo mensal</span>
                      <strong>
                        {monthlyProgress.percentualConsumo.toLocaleString('pt-BR', {
                          maximumFractionDigits: 2,
                        })}%
                      </strong>
                    </div>

                    <p className="monthly-goal-value">
                      {monthlyProgress.consumoMensalKwh.toLocaleString('pt-BR', {
                        maximumFractionDigits: 3,
                      })} kWh
                      <span>
                        {' '}de{' '}
                        {monthlyProgress.metaConsumoKwh.toLocaleString('pt-BR')} kWh
                      </span>
                    </p>

                    <div
                      className="monthly-goal-track"
                      role="progressbar"
                      aria-label="Progresso da meta mensal de consumo"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.min(
                        100,
                        Math.max(0, monthlyProgress.percentualConsumo),
                      )}
                    >
                      <div
                        className="monthly-goal-fill"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(0, monthlyProgress.percentualConsumo),
                          )}%`,
                        }}
                      />
                    </div>

                    <p className="monthly-goal-remaining">
                      {monthlyProgress.percentualConsumo >= 100
                        ? 'Meta de consumo atingida ou ultrapassada.'
                        : `Restam ${Math.max(
                            0,
                            monthlyProgress.metaConsumoKwh -
                              monthlyProgress.consumoMensalKwh,
                          ).toLocaleString('pt-BR', {
                            maximumFractionDigits: 3,
                          })} kWh da meta.`}
                    </p>
                  </article>

                  <article className="monthly-goal-card">
                    <div className="monthly-goal-heading">
                      <span>Custo mensal</span>
                      <strong>
                        {monthlyProgress.percentualCusto.toLocaleString('pt-BR', {
                          maximumFractionDigits: 2,
                        })}%
                      </strong>
                    </div>

                    <p className="monthly-goal-value">
                      {monthlyProgress.custoMensalReais.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                      <span>
                        {' '}de{' '}
                        {monthlyProgress.metaCustoReais.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </span>
                    </p>

                    <div
                      className="monthly-goal-track"
                      role="progressbar"
                      aria-label="Progresso da meta mensal de custo"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.min(
                        100,
                        Math.max(0, monthlyProgress.percentualCusto),
                      )}
                    >
                      <div
                        className="monthly-goal-fill"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(0, monthlyProgress.percentualCusto),
                          )}%`,
                        }}
                      />
                    </div>

                    <p className="monthly-goal-remaining">
                      {monthlyProgress.percentualCusto >= 100
                        ? 'Meta financeira atingida ou ultrapassada.'
                        : `Restam ${Math.max(
                            0,
                            monthlyProgress.metaCustoReais -
                              monthlyProgress.custoMensalReais,
                          ).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })} da meta.`}
                    </p>
                  </article>
                </div>
              )}
            </>
          )}
        </section>



        <section className="chart-section monitoring-section">
          <div className="monitoring-compact-layout">
            <div className="monitoring-copy">
              <h2>Monitoramento atual</h2>
              <p>Escolha o aparelho que receberá as próximas medições do ESP32.</p>
            </div>
            <label className="device-select-label monitoring-select-label">
              Aparelho conectado ao PZEM-004T
              <select
                disabled={devices.length === 0 || isSelectingDevice}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => void handleDeviceSelection(event)}
                value={selectedDeviceId ?? ''}
              >
                <option value="" disabled>
                  {devices.length === 0 ? 'Nenhum aparelho disponível' : 'Selecione um aparelho'}
                </option>
                {devices.map((device) => (
                  <option key={device.aparelhoId} value={device.aparelhoId}>
                    {device.device}
                  </option>
                ))}
              </select>
            </label>
            <span className={selectionError ? 'status-dot' : selectedDeviceId !== null ? 'status-dot online' : 'status-dot'} />
          </div>
          {selectedDevice && (
            <p className="monitoring-selection-note">
              <strong>{selectedDevice.device}</strong> está selecionado. As próximas medições recebidas pelo backend serão associadas a ele.
            </p>
          )}
          {isSelectingDevice && <span className="loading-pill">Selecionando aparelho...</span>}
          {selectionMessage && <p className="chart-footnote">{selectionMessage}</p>}
          {selectionError && <p className="error-message">Não foi possível selecionar o aparelho: {selectionError}</p>}
        </section>

        <section className="chart-section readings-section">
          <div className="section-heading">
            <div>
              <h2>Últimas leituras por aparelho</h2>
              <p>Última medição armazenada para cada aparelho cadastrado; atualização automática a cada 5 segundos.</p>
            </div>
            <span className={latestMeasurementError ? 'status-dot' : 'status-dot online'} />
          </div>

          {latestMeasurementError && (
            <p className="error-message">
              Não foi possível atualizar as últimas leituras: {latestMeasurementError}
            </p>
          )}

          {latestMeasurements.length > 0 ? (
            <div className="device-readings-grid">
              {latestMeasurements.map((measurement) => {
                const measurementDate = measurement.dataHora ? new Date(measurement.dataHora) : null
                const ageSeconds = measurementDate && !Number.isNaN(measurementDate.getTime())
                  ? Math.max(0, Math.floor((now - measurementDate.getTime()) / 1000))
                  : null
                const isFresh = ageSeconds !== null && ageSeconds <= 15
                const isSelected = measurement.aparelhoId === selectedDeviceId

                const ageLabel = ageSeconds === null
                  ? 'Idade indisponível'
                  : ageSeconds < 60
                    ? `${ageSeconds} s atrás`
                    : ageSeconds < 3600
                      ? `${Math.floor(ageSeconds / 60)} min atrás`
                      : ageSeconds < 86400
                        ? `${Math.floor(ageSeconds / 3600)} h ${Math.floor((ageSeconds % 3600) / 60)} min atrás`
                        : `${Math.floor(ageSeconds / 86400)} dias ${Math.floor((ageSeconds % 86400) / 3600)} h atrás`

                return (
                  <article className={`device-reading-card ${isSelected ? 'is-monitored' : 'is-inactive'}`} key={measurement.aparelhoId}>
                    <div className="device-reading-heading">
                      <span className="device-reading-name">{measurement.nomeAparelho}</span>
                      <strong className="device-reading-status">
                        <span className="device-reading-status-dot" />
                        {isSelected ? 'Monitorado' : 'Não monitorado'}
                      </strong>
                    </div>

                    {measurement.possuiMedicao ? (
                      <>
                        <div className="device-reading-metrics" aria-label={`Última medição de ${measurement.nomeAparelho}`}>
                          <article>
                            <span>Potência</span>
                            <strong>{measurement.potencia?.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) ?? '—'} W</strong>
                          </article>
                          <article>
                            <span>Tensão</span>
                            <strong>{measurement.tensao?.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) ?? '—'} V</strong>
                          </article>
                          <article>
                            <span>Corrente</span>
                            <strong>{measurement.corrente?.toLocaleString('pt-BR', { maximumFractionDigits: 3 }) ?? '—'} A</strong>
                          </article>
                          <article>
                            <span>Fator de potência</span>
                            <strong>{measurement.fatorPotencia?.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) ?? '—'}</strong>
                          </article>
                        </div>
                        <p className="chart-footnote">
                          Frequência: {measurement.frequencia?.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) ?? '—'} Hz ·
                          {' '}Última leitura: {measurementDate && !Number.isNaN(measurementDate.getTime())
                            ? measurementDate.toLocaleString('pt-BR')
                            : 'Horário indisponível'}
                        </p>
                        <p className={`device-reading-freshness ${isFresh ? 'fresh' : 'stale'}`}>
                          {isFresh ? 'Leitura recente' : `Leitura desatualizada · ${ageLabel}`}
                        </p>
                      </>
                    ) : (
                      <p className="empty-state">Este aparelho ainda não possui medições registradas.</p>
                    )}
                  </article>
                )
              })}
            </div>
          ) : (
            !latestMeasurementError && (
              <p className="empty-state">Ainda não há aparelhos com leituras disponíveis.</p>
            )
          )}

          {lastCheckedAt && (
            <p className="chart-footnote">
              Última consulta à API: {lastCheckedAt.toLocaleTimeString('pt-BR')}
            </p>
          )}
        </section>

        <section className="chart-section">
          <div className="section-heading">
            <div>
              <h2>Histórico consolidado de consumo</h2>
              <p>Energia calculada a partir dos intervalos válidos de todos os aparelhos cadastrados</p>
            </div>
            <div className="chart-controls">
              <label className="device-select-label">
                Período do histórico
                <select value={historyPeriod} onChange={(event: ChangeEvent<HTMLSelectElement>) => setHistoryPeriod(event.target.value as typeof historyPeriod)}>
                  <option value="all">Todo o histórico</option>
                  <option value="hour">Última hora</option>
                  <option value="today">Hoje (por hora)</option>
                  <option value="7days">Últimos 7 dias</option>
                  <option value="month">Este mês</option>
                </select>
              </label>
              <button
                className="secondary-button"
                type="button"
                disabled={devices.length === 0 || isLoadingHistory}
                onClick={() => setHistoryRefreshKey((current) => current + 1)}
              >
                {isLoadingHistory ? 'Atualizando...' : 'Atualizar histórico'}
              </button>
            </div>
          </div>

          {isLoadingHistory && <span className="loading-pill">Carregando histórico...</span>}
          {historyError && <p className="error-message">{historyError}</p>}
          {!isLoadingDevices && !apiError && devices.length === 0 && (
            <p className="empty-state">A API não retornou aparelhos cadastrados.</p>
          )}
          <EnergyChart data={history?.historico ?? []} period={historyPeriod} referenceTime={historyReferenceTime ?? undefined} />
          {history && (
            <p className="chart-footnote">
              Visão consolidada: {history.quantidadeMedicoes.toLocaleString('pt-BR')} medições recebidas de todos os aparelhos;{' '}
              {history.quantidadeIntervalosValidos.toLocaleString('pt-BR')} intervalos válidos utilizados no cálculo.
            </p>
          )}
        </section>

        <section className="chart-section">
          <div className="section-heading">
            <div>
              <h2>Consumo por aparelho</h2>
              <p>Comparação do consumo registrado por aparelho durante o mês atual; atualização automática a cada minuto</p>
            </div>
            <span className="goals-interval-count">Mês atual</span>
          </div>
          {historyError && <p className="error-message">Não foi possível calcular o consumo mensal por aparelho: {historyError}</p>}
          <DeviceConsumptionChart data={monthlyDeviceConsumption.map((item) => ({
            ...item,
            device: devices.find((device) => device.aparelhoId === item.aparelhoId)?.device ?? item.device,
          }))} />
        </section>

        {apiError && <p className="error-message">Não foi possível carregar os aparelhos: {apiError}</p>}
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
          <button className={activePage === 'dashboard' ? 'active' : ''} onClick={() => navigateTo('dashboard')} type="button">Dashboard</button>
          <button className={activePage === 'history' ? 'active' : ''} onClick={() => navigateTo('history')} type="button">Histórico de consumo</button>
          <button className={activePage === 'devices' ? 'active' : ''} onClick={() => navigateTo('devices')} type="button">Aparelhos</button>
          <button className={activePage === 'goals' ? 'active' : ''} onClick={() => navigateTo('goals')} type="button">Metas e cotas</button>
          <button className={activePage === 'alerts' ? 'active' : ''} onClick={() => navigateTo('alerts')} type="button">Alertas</button>
          <button className={activePage === 'settings' ? 'active' : ''} onClick={() => navigateTo('settings')} type="button">Configurações</button>
        </nav>
      </aside>

      {isMenuOpen && (
        <button aria-label="Fechar menu" className="sidebar-backdrop" onClick={() => setIsMenuOpen(false)} type="button" />
      )}

      <main className="dashboard">
        <section className="topbar">
          <button aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'} className="menu-button" onClick={() => setIsMenuOpen((current) => !current)} type="button">
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
