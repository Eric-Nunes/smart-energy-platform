export type EnergyPeriod = 'day' | 'week' | 'month' | 'year'

export type EnergyConsumptionPoint = {
  label: string
  consumption: number
}

export type DeviceConsumptionPoint = {
  device: string
  consumption: number
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
    { label: 'Sab', consumption: 18.7 },
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

const fallbackDeviceData: Record<EnergyPeriod, DeviceConsumptionPoint[]> = {
  day: [
    { device: 'Geladeira', consumption: 4.8 },
    { device: 'Chuveiro', consumption: 6.2 },
    { device: 'Ar-condicionado', consumption: 7.4 },
    { device: 'Computador', consumption: 2.1 },
    { device: 'Televisão', consumption: 1.5 },
    { device: 'Carregadores', consumption: 0.6 },
  ],
  week: [
    { device: 'Geladeira', consumption: 32.6 },
    { device: 'Chuveiro', consumption: 38.4 },
    { device: 'Ar-condicionado', consumption: 46.7 },
    { device: 'Computador', consumption: 12.3 },
    { device: 'Televisão', consumption: 9.8 },
    { device: 'Carregadores', consumption: 4.1 },
  ],
  month: [
    { device: 'Geladeira', consumption: 126 },
    { device: 'Chuveiro', consumption: 148 },
    { device: 'Ar-condicionado', consumption: 184 },
    { device: 'Computador', consumption: 46 },
    { device: 'Televisão', consumption: 37 },
    { device: 'Carregadores', consumption: 16 },
  ],
  year: [
    { device: 'Geladeira', consumption: 1512 },
    { device: 'Chuveiro', consumption: 1776 },
    { device: 'Ar-condicionado', consumption: 2208 },
    { device: 'Computador', consumption: 552 },
    { device: 'Televisão', consumption: 444 },
    { device: 'Carregadores', consumption: 192 },
  ],
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
      data: (await response.json()) as DeviceConsumptionPoint[],
      source: 'api' as const,
    }
  } catch {
    return {
      data: fallbackDeviceData[period],
      source: 'fallback' as const,
    }
  }
}
