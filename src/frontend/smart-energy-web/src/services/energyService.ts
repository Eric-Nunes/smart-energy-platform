export type EnergyPeriod = 'day' | 'week' | 'month' | 'year'

export type EnergyConsumptionPoint = {
  label: string
  consumption: number
}

export type ResidenceRoom = {
  id: string
  name: string
}

export type ResidenceUnit = {
  id: string
  name: string
  state: string
  city: string
  residents: number
  rooms: ResidenceRoom[]
}

export type ManagedDevice = {
  id: string
  device: string
  room: string
  residenceId: string
  smartPlugName: string
  consumption: number
  history: EnergyConsumptionPoint[]
}

const API_BASE_URL = 'http://localhost:5092'

const fallbackData: Record<EnergyPeriod, EnergyConsumptionPoint[]> = {
  day: Array.from({ length: 24 }, (_, hour) => ({
    label: `${String(hour).padStart(2, '0')}h`,
    consumption: [
      0.5, 0.42, 0.38, 0.35, 0.34, 0.48, 0.82, 1.15, 1.28, 1.42, 1.62, 1.95, 2.24, 2.12, 1.88,
      1.76, 2.08, 2.86, 3.42, 3.18, 2.74, 2.15, 1.42, 0.86,
    ][hour],
  })),
  week: [
    { label: 'Seg', consumption: 13.6 },
    { label: 'Ter', consumption: 12.8 },
    { label: 'Qua', consumption: 15.1 },
    { label: 'Qui', consumption: 14.4 },
    { label: 'Sex', consumption: 16.9 },
    { label: 'Sáb', consumption: 18.7 },
    { label: 'Dom', consumption: 17.2 },
  ],
  month: [
    { label: 'Sem 1', consumption: 82 },
    { label: 'Sem 2', consumption: 91 },
    { label: 'Sem 3', consumption: 86 },
    { label: 'Sem 4', consumption: 96 },
  ],
  year: [
    { label: 'Jan', consumption: 312 },
    { label: 'Fev', consumption: 286 },
    { label: 'Mar', consumption: 301 },
    { label: 'Abr', consumption: 274 },
    { label: 'Mai', consumption: 263 },
    { label: 'Jun', consumption: 248 },
    { label: 'Jul', consumption: 256 },
    { label: 'Ago', consumption: 279 },
    { label: 'Set', consumption: 292 },
    { label: 'Out', consumption: 318 },
    { label: 'Nov', consumption: 336 },
    { label: 'Dez', consumption: 354 },
  ],
}

function createDeviceHistory(baseValue: number, period: EnergyPeriod): EnergyConsumptionPoint[] {
  if (period === 'day') {
    return [
      { label: '00h-06h', consumption: Number((baseValue * 0.18).toFixed(1)) },
      { label: '06h-12h', consumption: Number((baseValue * 0.24).toFixed(1)) },
      { label: '12h-18h', consumption: Number((baseValue * 0.27).toFixed(1)) },
      { label: '18h-23h', consumption: Number((baseValue * 0.31).toFixed(1)) },
    ]
  }

  if (period === 'week') {
    return [
      { label: 'Seg', consumption: Number((baseValue * 0.13).toFixed(1)) },
      { label: 'Ter', consumption: Number((baseValue * 0.12).toFixed(1)) },
      { label: 'Qua', consumption: Number((baseValue * 0.14).toFixed(1)) },
      { label: 'Qui', consumption: Number((baseValue * 0.15).toFixed(1)) },
      { label: 'Sex', consumption: Number((baseValue * 0.16).toFixed(1)) },
      { label: 'Sáb', consumption: Number((baseValue * 0.17).toFixed(1)) },
      { label: 'Dom', consumption: Number((baseValue * 0.13).toFixed(1)) },
    ]
  }

  if (period === 'month') {
    return [
      { label: 'Semana 1', consumption: Number((baseValue * 0.24).toFixed(1)) },
      { label: 'Semana 2', consumption: Number((baseValue * 0.26).toFixed(1)) },
      { label: 'Semana 3', consumption: Number((baseValue * 0.23).toFixed(1)) },
      { label: 'Semana 4', consumption: Number((baseValue * 0.27).toFixed(1)) },
    ]
  }

  return [
    { label: '1º tri', consumption: Number((baseValue * 0.24).toFixed(1)) },
    { label: '2º tri', consumption: Number((baseValue * 0.22).toFixed(1)) },
    { label: '3º tri', consumption: Number((baseValue * 0.25).toFixed(1)) },
    { label: '4º tri', consumption: Number((baseValue * 0.29).toFixed(1)) },
  ]
}

const fallbackDeviceBase = [
  {
    id: 'device-1',
    device: 'Geladeira',
    smartPlugName: 'Plug cozinha 01',
    residenceId: 'unit-main',
    room: 'Cozinha',
    values: { day: 4.8, week: 32.6, month: 126, year: 1512 },
  },
  {
    id: 'device-2',
    device: 'Chuveiro',
    smartPlugName: 'Plug banheiro 01',
    residenceId: 'unit-main',
    room: 'Banheiro social',
    values: { day: 6.2, week: 38.4, month: 148, year: 1776 },
  },
  {
    id: 'device-3',
    device: 'Ar-condicionado',
    smartPlugName: 'Plug suíte 01',
    residenceId: 'unit-main',
    room: 'Suíte',
    values: { day: 7.4, week: 46.7, month: 184, year: 2208 },
  },
  {
    id: 'device-4',
    device: 'Computador',
    smartPlugName: 'Plug escritório 01',
    residenceId: 'unit-main',
    room: 'Escritório',
    values: { day: 2.1, week: 12.3, month: 46, year: 552 },
  },
  {
    id: 'device-5',
    device: 'Televisão',
    smartPlugName: 'Plug sala 01',
    residenceId: 'unit-main',
    room: 'Sala',
    values: { day: 1.5, week: 9.8, month: 37, year: 444 },
  },
  {
    id: 'device-6',
    device: 'Carregadores',
    smartPlugName: 'Plug quarto 02',
    residenceId: 'unit-main',
    room: 'Quarto 2',
    values: { day: 0.6, week: 4.1, month: 16, year: 192 },
  },
]

function buildFallbackDevices(period: EnergyPeriod): ManagedDevice[] {
  return fallbackDeviceBase.map((item) => ({
    id: item.id,
    device: item.device,
    smartPlugName: item.smartPlugName,
    residenceId: item.residenceId,
    room: item.room,
    consumption: item.values[period],
    history: createDeviceHistory(item.values[period], period),
  }))
}

export async function getEnergyConsumption(period: EnergyPeriod) {
  try {
    const response = await fetch(`${API_BASE_URL}/energy/consumption?period=${period}`)

    if (!response.ok) {
      throw new Error('Erro ao buscar consumo')
    }

    return {
      data: (await response.json()) as EnergyConsumptionPoint[],
      source: 'api' as const,
    }
  } catch {
    return {
      data: fallbackData[period],
      source: 'fallback' as const,
    }
  }
}

export async function getDeviceConsumption(period: EnergyPeriod) {
  try {
    const response = await fetch(`${API_BASE_URL}/energy/devices?period=${period}`)

    if (!response.ok) {
      throw new Error('Erro ao buscar consumo por dispositivo')
    }

    return {
      data: (await response.json()) as ManagedDevice[],
      source: 'api' as const,
    }
  } catch {
    return {
      data: buildFallbackDevices(period),
      source: 'fallback' as const,
    }
  }
}
