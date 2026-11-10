import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import EnergyChart from '../components/EnergyChart'
import {
  getDeviceConsumption,
  getEnergyHistory,
  type DeviceConsumptionPoint,
  type EnergyHistoryResult,
} from '../services/energyService'

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Ocorreu um erro inesperado ao consultar o histórico.'
}

function formatKwh(value: number, digits = 6) {
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: digits })} kWh`
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  })
}

function formatDateTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('pt-BR')
}

type HistoryPeriod = 'all' | 'hour' | 'today' | '7days' | 'month'

const periodLabels: Record<HistoryPeriod, string> = {
  all: 'Todo o histórico',
  hour: 'Última hora',
  today: 'Hoje',
  '7days': 'Últimos 7 dias',
  month: 'Este mês',
}

type ComparisonMode = 'today' | '7days' | 'month'

const comparisonLabels: Record<ComparisonMode, string> = {
  today: 'Hoje até agora vs. mesmo horário de ontem',
  '7days': 'Últimos 7 dias vs. 7 dias anteriores',
  month: 'Este mês vs. mesmo período do mês anterior',
}

type ComparisonRange = {
  currentStart: Date
  currentEnd: Date
  previousStart: Date
  previousEnd: Date
}

function getComparisonRange(mode: ComparisonMode, now: Date): ComparisonRange {
  const currentEnd = new Date(now)
  const currentStart = new Date(now)
  const previousEnd = new Date(now)
  const previousStart = new Date(now)

  if (mode === 'today') {
    // Compara hoje até agora com o mesmo intervalo de ontem.
    currentStart.setHours(0, 0, 0, 0)
    previousStart.setDate(previousStart.getDate() - 1)
    previousStart.setHours(0, 0, 0, 0)
    previousEnd.setTime(previousStart.getTime() + (now.getTime() - currentStart.getTime()))
  } else if (mode === '7days') {
    // Duas janelas consecutivas de 168 horas, sem sobreposição.
    currentStart.setTime(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    previousEnd.setTime(currentStart.getTime())
    previousStart.setTime(previousEnd.getTime() - 7 * 24 * 60 * 60 * 1000)
  } else {
    // Compara o mês atual até agora com a mesma parte do mês anterior.
    currentStart.setDate(1)
    currentStart.setHours(0, 0, 0, 0)

    previousStart.setMonth(previousStart.getMonth() - 1, 1)
    previousStart.setHours(0, 0, 0, 0)

    const previousMonthLastDay = new Date(
      previousStart.getFullYear(),
      previousStart.getMonth() + 1,
      0,
    ).getDate()
    const comparisonDay = Math.min(now.getDate(), previousMonthLastDay)
    previousEnd.setFullYear(previousStart.getFullYear(), previousStart.getMonth(), comparisonDay)
    previousEnd.setHours(
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
      now.getMilliseconds(),
    )
  }

  return { currentStart, currentEnd, previousStart, previousEnd }
}

export default function HistoryPage() {
  const [devices, setDevices] = useState<DeviceConsumptionPoint[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null)
  const [history, setHistory] = useState<EnergyHistoryResult | null>(null)
  const [period, setPeriod] = useState<HistoryPeriod>('all')
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('7days')
  const [isLoadingDevices, setIsLoadingDevices] = useState(true)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [tablePage, setTablePage] = useState(0)
  const [sortKey, setSortKey] = useState<'date' | 'power' | 'energy'>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const rowsPerPage = 20

  useEffect(() => {
    let isCurrent = true

    async function loadDevices() {
      setIsLoadingDevices(true)
      setError(null)
      try {
        const result = await getDeviceConsumption()
        if (!isCurrent) return
        setDevices(result)
        setSelectedDeviceId((current) =>
          current !== null && result.some((device) => device.aparelhoId === current)
            ? current
            : result[0]?.aparelhoId ?? null,
        )
      } catch (loadError) {
        if (!isCurrent) return
        setDevices([])
        setSelectedDeviceId(null)
        setError(getErrorMessage(loadError))
      } finally {
        if (isCurrent) setIsLoadingDevices(false)
      }
    }

    void loadDevices()
    return () => { isCurrent = false }
  }, [])

  useEffect(() => {
    let isCurrent = true

    async function loadHistory() {
      if (selectedDeviceId === null) {
        setHistory(null)
        setHistoryError(null)
        return
      }

      setIsLoadingHistory(true)
      setHistoryError(null)
      try {
        // Atualiza o histórico detalhado e os custos atuais da API juntos.
        const [historyResult, consumptionResult] = await Promise.all([
          getEnergyHistory(selectedDeviceId),
          getDeviceConsumption(),
        ])

        if (isCurrent) {
          setHistory(historyResult)
          setDevices(consumptionResult)
        }
      } catch (loadError) {
        if (!isCurrent) return
        setHistoryError(getErrorMessage(loadError))
      } finally {
        if (isCurrent) setIsLoadingHistory(false)
      }
    }

    void loadHistory()
    return () => { isCurrent = false }
  }, [selectedDeviceId, refreshKey])

  const selectedDevice = devices.find((device) => device.aparelhoId === selectedDeviceId) ?? null

  const filteredHistory = useMemo(() => {
    if (!history) return []
    const now = new Date()
    let cutoff: Date | null = null

    if (period === 'hour') cutoff = new Date(now.getTime() - 60 * 60 * 1000)
    if (period === 'today') cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    if (period === '7days') cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    if (period === 'month') cutoff = new Date(now.getFullYear(), now.getMonth(), 1)

    if (!cutoff) return history.historico
    return history.historico.filter((item) => {
      const date = new Date(item.dataHora)
      return !Number.isNaN(date.getTime()) && date >= cutoff!
    })
  }, [history, period])

  useEffect(() => {
    setTablePage(0)
  }, [selectedDeviceId, period, refreshKey])

  const filteredConsumption = filteredHistory.reduce((total, item) => total + item.consumption, 0)

  const comparison = useMemo(() => {
    if (!history) return null

    const now = new Date()
    const range = getComparisonRange(comparisonMode, now)
    const inRange = (timestamp: string, start: Date, end: Date) => {
      const date = new Date(timestamp)
      return !Number.isNaN(date.getTime()) && date >= start && date < end
    }

    const currentItems = history.historico.filter((item) =>
      inRange(item.dataHora, range.currentStart, range.currentEnd),
    )
    const previousItems = history.historico.filter((item) =>
      inRange(item.dataHora, range.previousStart, range.previousEnd),
    )

    const currentConsumption = currentItems.reduce((total, item) => total + item.consumption, 0)
    const previousConsumption = previousItems.reduce((total, item) => total + item.consumption, 0)
    const percentageChange = previousItems.length > 0 && previousConsumption > 0
      ? ((currentConsumption - previousConsumption) / previousConsumption) * 100
      : null

    // Coverage indicates buckets with valid records, not continuous operation.
    const getCoveredBuckets = (items: typeof history.historico) => {
      const buckets = new Set<string>()
      for (const item of items) {
        const date = new Date(item.dataHora)
        if (Number.isNaN(date.getTime())) continue
        buckets.add(comparisonMode === 'today'
          ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`
          : `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`)
      }
      return buckets.size
    }

    const currentCoveredBuckets = getCoveredBuckets(currentItems)
    const previousCoveredBuckets = getCoveredBuckets(previousItems)
    const currentExpectedBuckets = comparisonMode === 'today'
      ? Math.max(1, Math.ceil((now.getTime() - range.currentStart.getTime()) / (60 * 60 * 1000)))
      : comparisonMode === '7days' ? 7 : now.getDate()
    const previousExpectedBuckets = comparisonMode === 'today'
      ? Math.max(1, Math.ceil((range.previousEnd.getTime() - range.previousStart.getTime()) / (60 * 60 * 1000)))
      : comparisonMode === '7days' ? 7
        : Math.max(1, Math.ceil((range.previousEnd.getTime() - range.previousStart.getTime()) / (24 * 60 * 60 * 1000)))

    const currentCoveragePercent = Math.min(100, currentCoveredBuckets / currentExpectedBuckets * 100)
    const previousCoveragePercent = Math.min(100, previousCoveredBuckets / previousExpectedBuckets * 100)
    const hasComparableCoverage = currentCoveragePercent >= 70
      && previousCoveragePercent >= 70
      && Math.abs(currentCoveragePercent - previousCoveragePercent) <= 25

    return {
      currentItemsCount: currentItems.length,
      previousItemsCount: previousItems.length,
      currentConsumption,
      previousConsumption,
      percentageChange,
      currentCoveredBuckets,
      previousCoveredBuckets,
      currentExpectedBuckets,
      previousExpectedBuckets,
      currentCoveragePercent,
      previousCoveragePercent,
      hasComparableCoverage,
    }
  }, [history, comparisonMode])

  const sortedHistory = useMemo(() => {
    const sorted = [...filteredHistory]
    sorted.sort((a, b) => {
      let comparison = 0

      if (sortKey === 'date') {
        comparison = new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime()
      } else if (sortKey === 'power') {
        comparison = a.potenciaMedia - b.potenciaMedia
      } else {
        comparison = a.consumption - b.consumption
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
    return sorted
  }, [filteredHistory, sortKey, sortDirection])

  const totalTablePages = Math.max(1, Math.ceil(sortedHistory.length / rowsPerPage))
  const visibleHistoryRows = sortedHistory.slice(tablePage * rowsPerPage, (tablePage + 1) * rowsPerPage)

  function handleSort(key: 'date' | 'power' | 'energy') {
    if (sortKey === key) {
      setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDirection(key === 'date' ? 'desc' : 'asc')
    }
    setTablePage(0)
  }

  function sortIndicator(key: 'date' | 'power' | 'energy') {
    if (sortKey !== key) return ''
    return sortDirection === 'asc' ? ' ↑' : ' ↓'
  }
  const filteredCost = selectedDevice && history && history.consumoTotalKwh > 0
    ? (filteredConsumption / history.consumoTotalKwh) * selectedDevice.estimatedCost
    : 0

  function handleDeviceChange(event: ChangeEvent<HTMLSelectElement>) {
    const value = Number(event.target.value)
    setSelectedDeviceId(Number.isInteger(value) && value > 0 ? value : null)
  }

  return (
    <section className="content-page history-page">
      <div className="page-heading">
        <p className="eyebrow">Análise de dados</p>
        <h1>Histórico de consumo</h1>
        <p className="header-copy">
          Explore o consumo calculado de cada aparelho ao longo do tempo. Consultar o histórico não altera qual aparelho está sendo monitorado pelo ESP32.
        </p>
      </div>

      <section className="chart-section history-toolbar" aria-label="Filtros do histórico">
        <div className="chart-controls">
          <label className="device-select-label">
            Aparelho para consulta
            <select value={selectedDeviceId ?? ''} onChange={handleDeviceChange} disabled={isLoadingDevices || devices.length === 0}>
              <option value="" disabled>{isLoadingDevices ? 'Carregando aparelhos...' : 'Nenhum aparelho disponível'}</option>
              {devices.map((device) => (
                <option key={device.aparelhoId} value={device.aparelhoId}>{device.device}</option>
              ))}
            </select>
          </label>

          <label className="device-select-label">
            Período analisado
            <select value={period} onChange={(event) => setPeriod(event.target.value as HistoryPeriod)}>
              {Object.entries(periodLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <button className="secondary-button" type="button" onClick={() => setRefreshKey((current) => current + 1)} disabled={selectedDeviceId === null || isLoadingHistory}>
            {isLoadingHistory ? 'Consultando...' : 'Atualizar histórico'}
          </button>
        </div>
      </section>

      {error && <p className="error-message">Não foi possível carregar os aparelhos: {error}</p>}
      {historyError && <p className="error-message">Não foi possível carregar o histórico: {historyError}</p>}
      {!error && !isLoadingDevices && devices.length === 0 && <p className="empty-state">A API não retornou aparelhos cadastrados.</p>}

      {selectedDevice && history && !historyError && (
        <>
          <div className="page-heading history-device-heading">
            <h2>{history.nomeAparelho}</h2>
            <p className="header-copy">Valores calculados a partir dos intervalos válidos entre medições registradas.</p>
          </div>

          <section className="metrics-grid history-summary" aria-label="Resumo do histórico">
            <article><span>Consumo no período</span><strong>{formatKwh(filteredConsumption)}</strong></article>
            <article><span>Custo estimado no período</span><strong>{formatCurrency(filteredCost)}</strong></article>
            <article><span>Medições recebidas (histórico completo)</span><strong>{history.quantidadeMedicoes.toLocaleString('pt-BR')}</strong></article>
            <article><span>Intervalos válidos no período</span><strong>{filteredHistory.length.toLocaleString('pt-BR')}</strong></article>
          </section>

          <section className="chart-section" aria-label="Comparação de consumo entre períodos">
            <div className="section-heading">
              <div>
                <h2>Comparar períodos</h2>
                <p>Compare o consumo registrado do mesmo aparelho em intervalos diferentes.</p>
              </div>
            </div>

            <label className="device-select-label">
              Períodos para comparar
              <select
                value={comparisonMode}
                onChange={(event) => setComparisonMode(event.target.value as ComparisonMode)}
              >
                {Object.entries(comparisonLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            {comparison && (
              <>
                <div className="metrics-grid history-summary" style={{ marginTop: '16px' }}>
                  <article>
                    <span>{comparisonMode === 'today' ? 'Consumo de hoje' : comparisonMode === '7days' ? 'Consumo nas últimas 7 dias' : 'Consumo neste mês'}</span>
                    <strong>
                      {comparison.currentItemsCount > 0
                        ? formatKwh(comparison.currentConsumption)
                        : 'Sem dados disponíveis'}
                    </strong>
                    <span>{comparison.currentItemsCount.toLocaleString('pt-BR')} intervalos válidos</span>
                    <span>
                      {comparisonMode === 'today'
                        ? `Registros em ${comparison.currentCoveredBuckets} das ${comparison.currentExpectedBuckets} horas decorridas de hoje`
                        : comparisonMode === '7days'
                          ? `Registros em ${comparison.currentCoveredBuckets} dos ${comparison.currentExpectedBuckets} dias do período`
                          : `Registros em ${comparison.currentCoveredBuckets} dos ${comparison.currentExpectedBuckets} dias transcorridos do mês`}
                      ({comparison.currentCoveragePercent.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%)
                    </span>
                    <div
                      role="progressbar"
                      aria-label="Cobertura de dados do período atual"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(comparison.currentCoveragePercent)}
                      style={{ height: '8px', width: '100%', background: 'var(--surface-tertiary, #e5e7eb)', borderRadius: '999px', overflow: 'hidden', marginTop: '6px' }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${comparison.currentCoveragePercent}%`,
                          background: comparison.currentCoveragePercent >= 70 ? '#16a34a' : comparison.currentCoveragePercent >= 40 ? '#d97706' : '#dc2626',
                          borderRadius: '999px',
                          transition: 'width 180ms ease',
                        }}
                      />
                    </div>
                  </article>
                  <article>
                    <span>{comparisonMode === 'today' ? 'Consumo de ontem' : comparisonMode === '7days' ? 'Consumo nos 7 dias anteriores' : 'Consumo no mesmo período do mês anterior'}</span>
                    <strong>
                      {comparison.previousItemsCount > 0
                        ? formatKwh(comparison.previousConsumption)
                        : 'Sem dados disponíveis'}
                    </strong>
                    <span>{comparison.previousItemsCount.toLocaleString('pt-BR')} intervalos válidos</span>
                    <span>
                      {comparisonMode === 'today'
                        ? `Registros em ${comparison.previousCoveredBuckets} das ${comparison.previousExpectedBuckets} horas do mesmo intervalo de ontem`
                        : comparisonMode === '7days'
                          ? `Registros em ${comparison.previousCoveredBuckets} dos ${comparison.previousExpectedBuckets} dias do período anterior`
                          : `Registros em ${comparison.previousCoveredBuckets} dos ${comparison.previousExpectedBuckets} dias equivalentes do mês anterior`}
                      ({comparison.previousCoveragePercent.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%)
                    </span>
                    <div
                      role="progressbar"
                      aria-label="Cobertura de dados do período anterior"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(comparison.previousCoveragePercent)}
                      style={{ height: '8px', width: '100%', background: 'var(--surface-tertiary, #e5e7eb)', borderRadius: '999px', overflow: 'hidden', marginTop: '6px' }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${comparison.previousCoveragePercent}%`,
                          background: comparison.previousCoveragePercent >= 70 ? '#16a34a' : comparison.previousCoveragePercent >= 40 ? '#d97706' : '#dc2626',
                          borderRadius: '999px',
                          transition: 'width 180ms ease',
                        }}
                      />
                    </div>
                  </article>
                  <article>
                    <span>Variação do consumo</span>
                    <strong>
                      {comparison.percentageChange === null
                        ? 'Indisponível'
                        : `${comparison.percentageChange > 0 ? '+' : ''}${comparison.percentageChange.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`}
                    </strong>
                    <span>
                      {comparison.currentItemsCount === 0 || comparison.previousItemsCount === 0
                        ? 'É necessário haver dados nos dois períodos.'
                        : comparison.previousConsumption === 0
                          ? 'O período anterior não tem consumo positivo para comparação percentual.'
                          : comparison.percentageChange! > 0
                            ? 'Consumo maior no período atual.'
                            : comparison.percentageChange! < 0
                              ? 'Consumo menor no período atual.'
                              : 'Consumo igual nos dois períodos.'}
                    </span>
                  </article>
                </div>
                <p className="chart-footnote">
                  Um período conta como coberto quando contém pelo menos um intervalo válido. Isso não garante monitoramento contínuo durante toda a hora ou o dia.
                  “Sem dados disponíveis” significa que não há intervalos válidos registrados; não significa consumo zero.
                </p>
                {comparison.currentItemsCount > 0 && comparison.previousItemsCount > 0 && !comparison.hasComparableCoverage && (
                  <p className="error-message" role="status">
                    Atenção: a cobertura dos períodos é muito diferente ou insuficiente. Interprete a variação de consumo com cautela; ela pode refletir diferenças nos registros, não necessariamente economia ou aumento real.
                  </p>
                )}
              </>
            )}
          </section>

          <section className="chart-section">
            <div className="section-heading">
              <div>
                <h2>Evolução do consumo</h2>
                <p>Energia calculada por intervalo · {periodLabels[period]}</p>
              </div>
              {isLoadingHistory && <span className="loading-pill">Atualizando histórico...</span>}
            </div>

            {filteredHistory.length > 0
              ? <EnergyChart data={filteredHistory} period={period === 'all' ? 'all' : period} />
              : <p className="empty-state">Não há intervalos registrados para o período selecionado.</p>}

            <p className="chart-footnote">
              Histórico completo: {history.quantidadeMedicoes.toLocaleString('pt-BR')} medições recebidas e {history.quantidadeIntervalosValidos.toLocaleString('pt-BR')} intervalos válidos utilizados no cálculo.
            </p>
          </section>

          <section className="chart-section">
            <div className="section-heading">
              <div>
                <h2>Detalhamento dos intervalos</h2>
                <p>Energia calculada entre duas medições consecutivas válidas.</p>
              </div>
              <span className="chart-footnote">{filteredHistory.length.toLocaleString('pt-BR')} intervalos no período</span>
            </div>

            {filteredHistory.length === 0 ? (
              <p className="empty-state">Nenhum intervalo disponível para exibir.</p>
            ) : (
              <>
                <div className="data-table history-data-table" style={{ gap: '6px' }}>
                  <div className="history-table-header" role="row" style={{ display: 'grid', gridTemplateColumns: 'minmax(190px, 1.4fr) minmax(130px, 1fr) minmax(150px, 1fr)', gap: '12px', alignItems: 'center', padding: '10px 14px' }}>
                    <button type="button" className="history-sort-button" style={{ background: 'transparent', border: 0, padding: 0, margin: 0, color: 'inherit', font: 'inherit', fontWeight: 700, textAlign: 'left', cursor: 'pointer' }} onClick={() => handleSort('date')} aria-label={`Ordenar por data e hora${sortIndicator('date')}`}>
                      Data e hora{sortIndicator('date')}
                    </button>
                    <button type="button" className="history-sort-button" style={{ background: 'transparent', border: 0, padding: 0, margin: 0, color: 'inherit', font: 'inherit', fontWeight: 700, textAlign: 'left', cursor: 'pointer' }} onClick={() => handleSort('power')} aria-label={`Ordenar por potência média${sortIndicator('power')}`}>
                      Potência média{sortIndicator('power')}
                    </button>
                    <button type="button" className="history-sort-button" style={{ background: 'transparent', border: 0, padding: 0, margin: 0, color: 'inherit', font: 'inherit', fontWeight: 700, textAlign: 'left', cursor: 'pointer' }} onClick={() => handleSort('energy')} aria-label={`Ordenar por energia do intervalo${sortIndicator('energy')}`}>
                      Energia do intervalo{sortIndicator('energy')}
                    </button>
                  </div>
                  {visibleHistoryRows.map((item, index) => (
                    <article key={`${item.dataHora}-${tablePage}-${index}`} className="history-table-row" style={{ display: 'grid', gridTemplateColumns: 'minmax(190px, 1.4fr) minmax(130px, 1fr) minmax(150px, 1fr)', gap: '12px', alignItems: 'center', padding: '10px 14px' }}>
                      <span>{formatDateTime(item.dataHora)}</span>
                      <span>{item.potenciaMedia.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} W</span>
                      <span>{formatKwh(item.consumption, 8)}</span>
                    </article>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginTop: '14px', flexWrap: 'wrap' }}>
                  <span className="chart-footnote">
                    Exibindo {sortedHistory.length === 0 ? 0 : tablePage * rowsPerPage + 1}–{Math.min((tablePage + 1) * rowsPerPage, sortedHistory.length)} de {sortedHistory.length.toLocaleString('pt-BR')} intervalos
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button className="secondary-button" type="button" disabled={tablePage === 0} onClick={() => setTablePage((page) => Math.max(0, page - 1))}>Anterior</button>
                    <span className="chart-footnote">Página {tablePage + 1} de {totalTablePages}</span>
                    <button className="secondary-button" type="button" disabled={tablePage + 1 >= totalTablePages} onClick={() => setTablePage((page) => Math.min(totalTablePages - 1, page + 1))}>Próxima</button>
                  </div>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </section>
  )
}
