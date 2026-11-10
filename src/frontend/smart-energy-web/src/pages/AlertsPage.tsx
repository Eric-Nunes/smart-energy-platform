import { useCallback, useEffect, useState } from 'react'
import {
  getCurrentMonitoredDevice,
  getLatestMeasurementsByDevice,
  getProgressoMensal,
  type LatestMeasurementByDevice,
  type ProgressoMensal,
} from '../services/energyService'

import '../AlertsPage.css'

type AlertSeverity = 'critical' | 'warning' | 'info'
type AlertItem = {
  id: string
  severity: AlertSeverity
  title: string
  description: string
  source: string
  occurredAt: string | null
  value?: string
}

type AlertData = {
  progresso: ProgressoMensal | null
  ultimaMedicao: LatestMeasurementByDevice | null
  aparelhoMonitorado: string | null
}

const INTERVALO_ATUALIZACAO_MS = 5000
const LIMITE_SEM_COMUNICACAO_SEGUNDOS = 30

function formatarDataHora(data: string | null): string {
  if (!data) return 'Horário não disponível'
  const valor = new Date(data)
  if (Number.isNaN(valor.getTime())) return 'Horário não disponível'
  return valor.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatarPercentual(valor: number): string {
  return `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
}

function criarAlertas(data: AlertData): AlertItem[] {
  const alertas: AlertItem[] = []
  const progresso = data.progresso

  if (progresso?.metaConfigurada) {
    const indicadores = [
      {
        id: 'consumo',
        nome: 'consumo mensal',
        percentual: progresso.percentualConsumo,
        meta: progresso.metaConsumoKwh,
        atual: progresso.consumoMensalKwh,
        unidade: 'kWh',
      },
      {
        id: 'custo',
        nome: 'custo mensal',
        percentual: progresso.percentualCusto,
        meta: progresso.metaCustoReais,
        atual: progresso.custoMensalReais,
        unidade: 'R$',
      },
    ]

    for (const indicador of indicadores) {
      if (indicador.percentual === null || indicador.percentual === undefined) continue

      const percentual = indicador.percentual
      if (percentual >= 100) {
        alertas.push({
          id: `meta-${indicador.id}`,
          severity: 'critical',
          title: `Meta de ${indicador.nome} ultrapassada`,
          description: `O valor registrado já atingiu ou ultrapassou a meta mensal configurada.`,
          source: 'Progresso mensal',
          occurredAt: null,
          value: `${indicador.atual.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${indicador.unidade} de ${indicador.meta?.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) ?? '—'} ${indicador.unidade} (${formatarPercentual(percentual)})`,
        })
      } else if (percentual >= 80) {
        alertas.push({
          id: `meta-${indicador.id}`,
          severity: 'warning',
          title: `Meta de ${indicador.nome} próxima do limite`,
          description: `O valor registrado alcançou pelo menos 80% da meta mensal configurada.`,
          source: 'Progresso mensal',
          occurredAt: null,
          value: `${indicador.atual.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${indicador.unidade} de ${indicador.meta?.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) ?? '—'} ${indicador.unidade} (${formatarPercentual(percentual)})`,
        })
      }
    }
  }

  if (!data.aparelhoMonitorado) {
    alertas.push({
      id: 'monitoramento-nao-selecionado',
      severity: 'info',
      title: 'Nenhum aparelho selecionado para monitoramento',
      description: 'Selecione um aparelho no Dashboard para associar as próximas medições recebidas pelo ESP32.',
      source: 'Monitoramento',
      occurredAt: null,
    })
  } else if (!data.ultimaMedicao || !data.ultimaMedicao.possuiMedicao || !data.ultimaMedicao.dataHora) {
    alertas.push({
      id: 'aguardando-primeira-medicao',
      severity: 'info',
      title: 'Aguardando primeira medição',
      description: `${data.aparelhoMonitorado} ainda não possui uma medição registrada.`,
      source: 'Monitoramento',
      occurredAt: null,
    })
  } else {
    const dataMedicao = new Date(data.ultimaMedicao.dataHora)
    const idadeSegundos = (Date.now() - dataMedicao.getTime()) / 1000

    if (!Number.isNaN(idadeSegundos) && idadeSegundos > LIMITE_SEM_COMUNICACAO_SEGUNDOS) {
      alertas.push({
        id: 'sem-comunicacao-recente',
        severity: 'warning',
        title: 'Nenhuma medição recente recebida',
        description: `${data.aparelhoMonitorado} está há mais de ${LIMITE_SEM_COMUNICACAO_SEGUNDOS} segundos sem registrar uma nova medição. Isso indica ausência de dados recentes, mas não confirma, por si só, uma desconexão do MQTT.`,
        source: 'Última medição',
        occurredAt: data.ultimaMedicao.dataHora,
        value: `Última leitura: ${formatarDataHora(data.ultimaMedicao.dataHora)}`,
      })
    }
  }

  return alertas
}

function obterClasseSeveridade(severidade: AlertSeverity): string {
  if (severidade === 'critical') return 'alerts-severity-critical'
  if (severidade === 'warning') return 'alerts-severity-warning'
  return 'alerts-severity-info'
}

function obterRotuloSeveridade(severidade: AlertSeverity): string {
  if (severidade === 'critical') return 'Crítico'
  if (severidade === 'warning') return 'Atenção'
  return 'Informativo'
}

export default function AlertsPage() {
  const [alertas, setAlertas] = useState<AlertItem[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null)

  const atualizarAlertas = useCallback(async () => {
    try {
      const [progressoResultado, aparelhoResultado, medicoesResultado] = await Promise.allSettled([
        getProgressoMensal(),
        getCurrentMonitoredDevice(),
        getLatestMeasurementsByDevice(),
      ])

      const progresso = progressoResultado.status === 'fulfilled' ? progressoResultado.value : null
      const aparelho = aparelhoResultado.status === 'fulfilled' ? aparelhoResultado.value : null
      const medicoes = medicoesResultado.status === 'fulfilled' ? medicoesResultado.value : []
      const ultimaMedicao = aparelho
        ? medicoes.find((item) => item.aparelhoId === aparelho.aparelhoId) ?? null
        : null

      const falhas: string[] = []
      if (progressoResultado.status === 'rejected') falhas.push('progresso mensal')
      if (aparelhoResultado.status === 'rejected') falhas.push('aparelho monitorado')
      if (medicoesResultado.status === 'rejected') falhas.push('últimas medições')

      if (falhas.length === 3) {
        throw new Error('Não foi possível consultar os dados necessários para gerar os alertas. Verifique se o backend está em execução.')
      }

      const novosAlertas = criarAlertas({
        progresso,
        ultimaMedicao,
        aparelhoMonitorado: aparelho?.nomeAparelho ?? null,
      })

      if (falhas.length > 0) {
        setErro(`Não foi possível atualizar: ${falhas.join(', ')}. Alguns alertas podem estar indisponíveis.`)
      } else {
        setErro('')
      }

      setAlertas(novosAlertas)
      setUltimaAtualizacao(new Date())
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Ocorreu um erro ao consultar os dados dos alertas.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void atualizarAlertas()
    const intervalo = window.setInterval(() => void atualizarAlertas(), INTERVALO_ATUALIZACAO_MS)
    return () => window.clearInterval(intervalo)
  }, [atualizarAlertas])

  const quantidadeCriticos = alertas.filter((alerta) => alerta.severity === 'critical').length
  const quantidadeAtencao = alertas.filter((alerta) => alerta.severity === 'warning').length
  const quantidadeInformativos = alertas.filter((alerta) => alerta.severity === 'info').length

  return (
    <section className="content-page alerts-page">
      <div className="page-heading">
        <p className="eyebrow">Monitoramento</p>
        <h1>Alertas e ocorrências</h1>
        <p className="header-copy">
          Acompanhe situações identificadas a partir do consumo, das metas e das últimas medições do SmartEnergy.
        </p>
      </div>

      <section className="alerts-summary-grid" aria-label="Resumo dos alertas">
        <article className="alerts-summary-card alerts-summary-total">
          <span className="alerts-summary-label">Alertas identificados</span>
          <strong>{alertas.length}</strong>
          <span className="alerts-summary-caption">Situações atuais detectadas</span>
        </article>
        <article className="alerts-summary-card alerts-summary-critical">
          <span className="alerts-summary-label">Críticos</span>
          <strong>{quantidadeCriticos}</strong>
          <span className="alerts-summary-caption">Metas atingidas ou ultrapassadas</span>
        </article>
        <article className="alerts-summary-card alerts-summary-warning">
          <span className="alerts-summary-label">Atenção</span>
          <strong>{quantidadeAtencao}</strong>
          <span className="alerts-summary-caption">Situações que merecem acompanhamento</span>
        </article>
        <article className="alerts-summary-card alerts-summary-info">
          <span className="alerts-summary-label">Informativos</span>
          <strong>{quantidadeInformativos}</strong>
          <span className="alerts-summary-caption">Estados de monitoramento</span>
        </article>
      </section>

      <section className="alerts-list-section">
        <div className="alerts-section-heading">
          <div>
            <h2>Situação atual</h2>
            <p>Os dados são consultados automaticamente a cada 5 segundos.</p>
          </div>
          <span className="alerts-last-update">
            {ultimaAtualizacao
              ? `Atualizado às ${ultimaAtualizacao.toLocaleTimeString('pt-BR')}`
              : 'Aguardando consulta'}
          </span>
        </div>

        {erro && <p className="error-message alerts-feedback" role="alert">{erro}</p>}

        {carregando ? (
          <div className="alerts-empty-state">Consultando dados do sistema...</div>
        ) : alertas.length === 0 ? (
          <div className="alerts-empty-state alerts-no-occurrences">
            <span className="alerts-empty-icon" aria-hidden="true">✓</span>
            <strong>Nenhuma ocorrência identificada</strong>
            <span>As metas e o monitoramento não apresentam condições de alerta neste momento.</span>
          </div>
        ) : (
          <div className="alerts-list">
            {alertas.map((alerta) => (
              <article className={`alerts-card ${obterClasseSeveridade(alerta.severity)}`} key={alerta.id}>
                <div className="alerts-card-indicator" aria-hidden="true" />
                <div className="alerts-card-content">
                  <div className="alerts-card-heading">
                    <h3>{alerta.title}</h3>
                    <span className={`alerts-severity-badge ${obterClasseSeveridade(alerta.severity)}`}>
                      {obterRotuloSeveridade(alerta.severity)}
                    </span>
                  </div>
                  <p>{alerta.description}</p>
                  {alerta.value && <strong className="alerts-card-value">{alerta.value}</strong>}
                  <div className="alerts-card-meta">
                    <span>{alerta.source}</span>
                    {alerta.occurredAt && <span>Última medição: {formatarDataHora(alerta.occurredAt)}</span>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <p className="alerts-disclaimer">
        Os alertas são calculados com base nos dados disponíveis na API. Períodos sem medições não representam, necessariamente, consumo zero.
      </p>
    </section>
  )
}
