export type BrazilianStateCode =
  | 'AC'
  | 'AL'
  | 'AP'
  | 'AM'
  | 'BA'
  | 'CE'
  | 'DF'
  | 'ES'
  | 'GO'
  | 'MA'
  | 'MT'
  | 'MS'
  | 'MG'
  | 'PA'
  | 'PB'
  | 'PR'
  | 'PE'
  | 'PI'
  | 'RJ'
  | 'RN'
  | 'RS'
  | 'RO'
  | 'RR'
  | 'SC'
  | 'SP'
  | 'SE'
  | 'TO'

export type EnergyTariff = {
  state: BrazilianStateCode
  stateName: string
  distributor: string
  pricePerKwh: number
  source: 'api' | 'fallback'
}

const API_BASE_URL = 'http://localhost:5092'

export const stateOptions: Array<{ value: BrazilianStateCode; label: string }> = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
]

const fallbackTariffs: Record<BrazilianStateCode, Omit<EnergyTariff, 'source'>> =
  stateOptions.reduce(
    (tariffs, state, index) => {
      const basePrice = 0.74 + (index % 7) * 0.035

      return {
        ...tariffs,
        [state.value]: {
          state: state.value,
          stateName: state.label,
          distributor: 'Tarifa residencial estimada',
          pricePerKwh: Number(basePrice.toFixed(2)),
        },
      }
    },
    {} as Record<BrazilianStateCode, Omit<EnergyTariff, 'source'>>,
  )

export async function getEnergyTariff(state: BrazilianStateCode): Promise<EnergyTariff> {
  try {
    const response = await fetch(`${API_BASE_URL}/energy/tariff?state=${state}`)

    if (!response.ok) {
      throw new Error('Erro ao buscar tarifa')
    }

    return {
      ...((await response.json()) as Omit<EnergyTariff, 'source'>),
      source: 'api',
    }
  } catch {
    return {
      ...fallbackTariffs[state],
      source: 'fallback',
    }
  }
}
