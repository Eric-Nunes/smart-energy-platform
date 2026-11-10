export type EnergyConsumptionPoint = {
  label: string
  dataHora: string
  consumption: number
  potenciaMedia: number
}

export type DeviceConsumptionPoint = {
  aparelhoId: number
  device: string
  consumption: number
  estimatedCost: number
  measurementCount: number
}

export type EnergyHistoryResult = {
  aparelhoId: number
  nomeAparelho: string
  quantidadeMedicoes: number
  quantidadeIntervalosValidos: number
  consumoTotalKwh: number
  historico: EnergyConsumptionPoint[]
}

export type LatestMeasurement = {
  aparelhoId: number
  nomeAparelho: string
  tensao: number
  corrente: number
  potencia: number
  frequencia: number
  fatorPotencia: number
  dataHora: string
}

export type LatestMeasurementByDevice = {
  aparelhoId: number
  nomeAparelho: string
  possuiMedicao: boolean
  tensao: number | null
  corrente: number | null
  potencia: number | null
  frequencia: number | null
  fatorPotencia: number | null
  dataHora: string | null
}

export type CombinedEnergyHistory = {
  quantidadeMedicoes: number
  quantidadeIntervalosValidos: number
  historico: EnergyConsumptionPoint[]
}

const API_BASE_URL = 'http://localhost:5092'

export type CurrentMonitoredDevice = {
  aparelhoId: number
  nomeAparelho: string
}

type ApiDeviceConsumption = {
  aparelhoId: number
  nomeAparelho: string
  quantidadeMedicoes: number
  consumoKwh: number
  custoEstimado: number
}

type ApiEnergyHistory = {
  aparelhoId: number
  nomeAparelho: string
  quantidadeMedicoes: number
  quantidadeIntervalosValidos: number
  consumoTotalKwh: number
  historico: Array<{
    dataHora: string
    potenciaMedia: number
    consumoKwh: number
  }>
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`A API retornou o erro ${response.status} ao consultar os dados de consumo.`)
  }

  return (await response.json()) as T
}

/** Retorna o consumo calculado pelo backend para cada aparelho cadastrado. */
export async function getDeviceConsumption(): Promise<DeviceConsumptionPoint[]> {
  const result = await fetchJson<ApiDeviceConsumption[]>(`${API_BASE_URL}/api/Consumo`)

  return result.map((item) => ({
    aparelhoId: item.aparelhoId,
    device: item.nomeAparelho,
    consumption: item.consumoKwh,
    estimatedCost: item.custoEstimado,
    measurementCount: item.quantidadeMedicoes,
  }))
}

/** Informa qual aparelho está atualmente selecionado no backend. */
export async function getCurrentMonitoredDevice(): Promise<CurrentMonitoredDevice | null> {
  const response = await fetch(`${API_BASE_URL}/api/Monitoramento/atual`)

  if (response.status === 204) return null
  if (!response.ok) {
    throw new Error(`A API retornou o erro ${response.status} ao consultar o aparelho selecionado.`)
  }

  return (await response.json()) as CurrentMonitoredDevice
}

/** Seleciona no backend o aparelho que receberá as próximas medições MQTT. */
export async function selectDeviceForMonitoring(aparelhoId: number): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/Monitoramento/aparelho/${aparelhoId}`,
    { method: 'POST' },
  )

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(
      detail || `A API retornou o erro ${response.status} ao selecionar o aparelho.`,
    )
  }
}


/** Retorna o histórico calculado a partir da potência média e do intervalo entre medições. */
export async function getEnergyHistory(aparelhoId: number): Promise<EnergyHistoryResult> {
  const result = await fetchJson<ApiEnergyHistory>(
    `${API_BASE_URL}/api/Consumo/aparelho/${aparelhoId}/historico`,
  )

  return {
    aparelhoId: result.aparelhoId,
    nomeAparelho: result.nomeAparelho,
    quantidadeMedicoes: result.quantidadeMedicoes,
    quantidadeIntervalosValidos: result.quantidadeIntervalosValidos,
    consumoTotalKwh: result.consumoTotalKwh,
    historico: result.historico.map((item) => {
      const date = new Date(item.dataHora)
      const label = Number.isNaN(date.getTime())
        ? item.dataHora
        : date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })

      return {
        label,
        dataHora: item.dataHora,
        consumption: item.consumoKwh,
        potenciaMedia: item.potenciaMedia,
      }
    }),
  }
}

/** Retorna a última medição gravada ou null quando ainda não há medições. */
export async function getLatestMeasurement(): Promise<LatestMeasurement | null> {
  const response = await fetch(`${API_BASE_URL}/api/Medicoes/ultima`)

  if (response.status === 204) {
    return null
  }

  if (!response.ok) {
    throw new Error(`A API retornou o erro ${response.status} ao consultar a última medição.`)
  }

  return (await response.json()) as LatestMeasurement
}

/** Retorna a última medição de cada aparelho, inclusive os que ainda não possuem registros. */
export async function getLatestMeasurementsByDevice(): Promise<LatestMeasurementByDevice[]> {
  return fetchJson<LatestMeasurementByDevice[]>(
    `${API_BASE_URL}/api/Medicoes/ultimas-por-aparelho`,
  )
}

/** Combina os intervalos válidos de todos os aparelhos para formar a visão geral da residência. */
export async function getCombinedEnergyHistory(
  aparelhoIds: number[],
): Promise<CombinedEnergyHistory> {
  if (aparelhoIds.length === 0) {
    return { quantidadeMedicoes: 0, quantidadeIntervalosValidos: 0, historico: [] }
  }

  const histories = await Promise.all(aparelhoIds.map((id) => getEnergyHistory(id)))

  const historico = histories
    .flatMap((item) => item.historico)
    .sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime())

  return {
    quantidadeMedicoes: histories.reduce((total, item) => total + item.quantidadeMedicoes, 0),
    quantidadeIntervalosValidos: histories.reduce(
      (total, item) => total + item.quantidadeIntervalosValidos,
      0,
    ),
    historico,
  }
}


export type TarifaAtual = {
  id: number
  estado: string
  valorKwh: number
  dataInicio: string
  dataFim: string | null
}

/** Consulta a tarifa ativa cadastrada no backend. */
export async function getTarifaAtual(): Promise<TarifaAtual> {
  const response = await fetch(`${API_BASE_URL}/api/Tarifas/atual`)

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(
      detail || `Erro ao consultar a tarifa: ${response.status}.`,
    )
  }

  return (await response.json()) as TarifaAtual
}

/** Atualiza o valor da tarifa ativa sem criar um novo registro. */
export async function updateTarifaAtual(valorKwh: number): Promise<TarifaAtual> {
  const response = await fetch(`${API_BASE_URL}/api/Tarifas/atual`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ valorKwh }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(
      detail || `Erro ao atualizar a tarifa: ${response.status}.`,
    )
  }

  const result = await response.json()

  return {
    id: result.id,
    estado: result.estado,
    valorKwh: result.valorKwh,
    dataInicio: result.dataInicio,
    dataFim: result.dataFim,
  }
}


export type MetaMensalAtual = {
  mesReferencia: string
  configurada: boolean
  metaConsumoKwh: number | null
  metaCustoReais: number | null
  dataAtualizacao?: string
}

export type AtualizarMetaMensal = {
  metaConsumoKwh: number
  metaCustoReais: number
}

/** Consulta as metas cadastradas para o mês atual. */
export async function getMetaMensalAtual(): Promise<MetaMensalAtual> {
  const response = await fetch(`${API_BASE_URL}/api/MetasMensais/atual`)

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(
      detail || `Erro ao consultar a meta mensal: ${response.status}.`,
    )
  }

  return (await response.json()) as MetaMensalAtual
}

/** Cria ou atualiza as metas de consumo e custo do mês atual. */
export async function updateMetaMensalAtual(
  meta: AtualizarMetaMensal,
): Promise<MetaMensalAtual> {
  const response = await fetch(`${API_BASE_URL}/api/MetasMensais/atual`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(meta),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(
      detail || `Erro ao salvar a meta mensal: ${response.status}.`,
    )
  }

  return (await response.json()) as MetaMensalAtual

}

export type ProgressoMensal = {
    mesReferencia: string
    consumoMensalKwh: number
    custoMensalReais: number
    quantidadeIntervalosValidos: number
    tarifaKwh: number
    metaConfigurada: boolean
    metaConsumoKwh: number | null
    metaCustoReais: number | null
    percentualConsumo: number | null
    percentualCusto: number | null
  }

  /** Consulta o consumo e o custo do mês comparados às metas cadastradas. */
  export async function getProgressoMensal(): Promise<ProgressoMensal> {
    const response = await fetch(
      `${API_BASE_URL}/api/Consumo/metas/progresso`,
    )

    if (!response.ok) {
      const detail = await response.text()
      throw new Error(
        detail || `Erro ao consultar o progresso mensal: ${response.status}.`,
      )
    }

    return (await response.json()) as ProgressoMensal
  }


// ===== Gestão de aparelhos =====

export type Aparelho = {
  id: number
  nomeAparelho: string
  localizacao: string | null
  usuarioId: number
  dataCadastro: string
}

export type AparelhoRequest = {
  nomeAparelho: string
  localizacao: string | null
}

type ApiAparelho = {
  id: number
  // A entidade C# utiliza underscore nos nomes das propriedades.
  nome_Aparelho?: string
  usuario_Id?: number
  data_Cadastro?: string
  // Mantém compatibilidade caso a API passe a retornar DTOs em camelCase.
  nomeAparelho?: string
  usuarioId?: number
  dataCadastro?: string
  localizacao: string | null
}

function mapAparelho(item: ApiAparelho): Aparelho {
  return {
    id: item.id,
    nomeAparelho: item.nomeAparelho ?? item.nome_Aparelho ?? '',
    localizacao: item.localizacao ?? null,
    usuarioId: item.usuarioId ?? item.usuario_Id ?? 1,
    dataCadastro: item.dataCadastro ?? item.data_Cadastro ?? '',
  }
}

async function getAparelhoError(response: Response, fallback: string): Promise<string> {
  const detail = await response.text()
  if (!detail) return `${fallback} (HTTP ${response.status}).`

  try {
    const parsed = JSON.parse(detail) as { title?: string; detail?: string; message?: string }
    return parsed.detail ?? parsed.message ?? parsed.title ?? detail
  } catch {
    return detail
  }
}

/** Lista os aparelhos cadastrados para o usuário padrão (ID 1). */
export async function getAparelhos(): Promise<Aparelho[]> {
  const response = await fetch(`${API_BASE_URL}/api/Aparelhos`)
  if (!response.ok) {
    throw new Error(await getAparelhoError(response, 'Não foi possível carregar os aparelhos'))
  }

  const result = (await response.json()) as ApiAparelho[]
  return result.map(mapAparelho)
}

/** Cadastra um aparelho para o usuário padrão (ID 1). */
export async function createAparelho(request: AparelhoRequest): Promise<Aparelho> {
  const response = await fetch(`${API_BASE_URL}/api/Aparelhos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error(await getAparelhoError(response, 'Não foi possível cadastrar o aparelho'))
  }

  return mapAparelho((await response.json()) as ApiAparelho)
}

/** Atualiza o nome e a localização de um aparelho existente. */
export async function updateAparelho(
  id: number,
  request: AparelhoRequest,
): Promise<Aparelho> {
  const response = await fetch(`${API_BASE_URL}/api/Aparelhos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error(await getAparelhoError(response, 'Não foi possível atualizar o aparelho'))
  }

  return mapAparelho((await response.json()) as ApiAparelho)
}

/** Exclui um aparelho; a API impede a operação quando existem medições vinculadas. */
export async function deleteAparelho(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/Aparelhos/${id}`, { method: 'DELETE' })

  if (!response.ok) {
    throw new Error(await getAparelhoError(response, 'Não foi possível excluir o aparelho'))
  }
}
