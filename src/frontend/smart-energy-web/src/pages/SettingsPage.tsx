
import { useEffect, useState } from 'react'
import {
  getTarifaAtual,
  updateTarifaAtual,
  getMetaMensalAtual,
  updateMetaMensalAtual,
} from '../services/energyService'


function formatarTarifa(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })
}

function formatarData(data: string): string {
  const valor = new Date(data)

  if (Number.isNaN(valor.getTime())) return data

  return valor.toLocaleDateString('pt-BR')
}

export default function SettingsPage() {
  const [tarifa, setTarifa] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [metaConsumo, setMetaConsumo] = useState('')
  const [metaCusto, setMetaCusto] = useState('')
  const [carregandoMeta, setCarregandoMeta] = useState(true)
  const [salvandoMeta, setSalvandoMeta] = useState(false)
  const [mensagemMeta, setMensagemMeta] = useState('')
  const [erroMeta, setErroMeta] = useState('')

  useEffect(() => {
    async function carregarTarifa() {
      try {
        const resultado = await getTarifaAtual()
        setTarifa(formatarTarifa(resultado.valorKwh))
        setDataInicio(resultado.dataInicio)
      } catch (error) {
        setErro(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar a tarifa.',
        )
      } finally {
        setCarregando(false)
      }
    }

    void carregarTarifa()
  }, [])

  useEffect(() => {
    async function carregarMeta() {
      try {
        const resultado = await getMetaMensalAtual()

        if (resultado.configurada) {
          setMetaConsumo(
            resultado.metaConsumoKwh?.toString() ?? '',
          )
          setMetaCusto(
            resultado.metaCustoReais?.toString() ?? '',
          )
        } else {
          setMetaConsumo('')
          setMetaCusto('')
        }
      } catch (error) {
        setErroMeta(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar as metas mensais.',
        )
      } finally {
        setCarregandoMeta(false)
      }
    }

  void carregarMeta()
  }, [])

  async function salvarTarifa() {
    setMensagem('')
    setErro('')

    const entrada = tarifa.trim()
    const valorNormalizado = entrada.includes(',')
      ? entrada.replace(/\./g, '').replace(',', '.')
      : entrada

    const valor = Number(valorNormalizado)

    if (
      !Number.isFinite(valor) ||
      valor <= 0 ||
      !/^\d+([.,]\d{1,4})?$/.test(entrada)
    ) {
      setErro(
        'Informe um valor maior que zero, com até quatro casas decimais.',
      )
      return
    }

    setSalvando(true)

    try {
      const resultado = await updateTarifaAtual(valor)

      setTarifa(formatarTarifa(resultado.valorKwh))
      setDataInicio(resultado.dataInicio)
      setMensagem('Tarifa atualizada com sucesso.')
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível atualizar a tarifa.',
      )
    } finally {
      setSalvando(false)
    }
  }

  function converterNumero(valor: string): number {
  const normalizado = valor.trim().replace(',', '.')
  return Number(normalizado)
}

  async function salvarMetaMensal() {
    setMensagemMeta('')
    setErroMeta('')

    const consumo = converterNumero(metaConsumo)
    const custo = converterNumero(metaCusto)

    if (
      !/^\d+([.,]\d{1,4})?$/.test(metaConsumo.trim()) ||
      !Number.isFinite(consumo) ||
      consumo <= 0
    ) {
      setErroMeta(
        'Informe uma meta de consumo maior que zero, com até quatro casas decimais.',
      )
      return
    }

    if (
      !/^\d+([.,]\d{1,2})?$/.test(metaCusto.trim()) ||
      !Number.isFinite(custo) ||
      custo <= 0
    ) {
      setErroMeta(
        'Informe uma meta de custo maior que zero, com até duas casas decimais.',
      )
      return
    }

    setSalvandoMeta(true)

    try {
      const resultado = await updateMetaMensalAtual({
        metaConsumoKwh: consumo,
        metaCustoReais: custo,
      })

      setMetaConsumo(
        resultado.metaConsumoKwh?.toString() ?? consumo.toString(),
      )
      setMetaCusto(
        resultado.metaCustoReais?.toString() ?? custo.toString(),
      )
      setMensagemMeta('Metas mensais salvas com sucesso.')
    } catch (error) {
      setErroMeta(
        error instanceof Error
          ? error.message
          : 'Não foi possível salvar as metas mensais.',
      )
    } finally {
      setSalvandoMeta(false)
    }
  }

  return (
    <section className="content-page settings-page">
      <div className="page-heading">
        <p className="eyebrow">Configurações</p>
        <h1>Preferências da plataforma</h1>
        <p className="header-copy">
          Gerencie os parâmetros utilizados nos cálculos de consumo e custo
          de energia.
        </p>
      </div>

      <article className="form-panel settings-tariff-panel">
        <div className="settings-panel-heading">
          <div>
            <p className="eyebrow">Energia e custos</p>
            <h2>Tarifa de energia</h2>
            <p className="settings-description">
              O valor por kWh é utilizado para estimar os custos de consumo
              apresentados no Dashboard.
            </p>
          </div>

          <span className="settings-state">São Paulo · SP</span>
        </div>

        <div className="settings-tariff-form">
          <label className="settings-tariff-field">
            Tarifa por kWh (R$)
            <input
              type="text"
              inputMode="decimal"
              value={tarifa}
              onChange={(event) => {
                setTarifa(event.target.value)
                setMensagem('')
                setErro('')
              }}
              disabled={carregando || salvando}
              placeholder={carregando ? 'Carregando tarifa...' : 'Ex.: 0,8500'}
              aria-describedby="tarifa-ajuda"
            />
          </label>

          <p id="tarifa-ajuda" className="settings-help">
            Utilize vírgula ou ponto como separador decimal. Máximo de
            quatro casas decimais.
          </p>

          <div className="settings-actions">
            <button
              type="button"
              className="primary-action"
              onClick={salvarTarifa}
              disabled={carregando || salvando}
            >
              {salvando ? 'Salvando...' : 'Salvar tarifa'}
            </button>
          </div>

          {mensagem && (
            <p className="settings-feedback success" role="status">
              {mensagem}
            </p>
          )}

          {erro && (
            <p className="settings-feedback error" role="alert">
              {erro}
            </p>
          )}
        </div>

        <div className="settings-tariff-footer">
          <div>
            <span>Origem do valor</span>
            <strong>Banco de dados da plataforma</strong>
          </div>

          <div>
            <span>Início da vigência cadastrada</span>
            <strong>
              {carregando
                ? 'Carregando...'
                : dataInicio
                  ? formatarData(dataInicio)
                  : 'Não disponível'}
            </strong>
          </div>
        </div>
      </article>

      
      <article className="form-panel settings-tariff-panel">
        <div className="settings-panel-heading">
          <div>
            <p className="eyebrow">Planejamento mensal</p>
            <h2>Metas da residência</h2>
            <p className="settings-description">
              Defina limites de consumo e gastos para acompanhar o desempenho
              energético da residência no mês atual.
            </p>
          </div>
        </div>

        <div className="settings-tariff-form">
          <label className="settings-tariff-field">
            Consumo máximo mensal (kWh)
            <input
              type="number"
              min="0.0001"
              step="0.0001"
              value={metaConsumo}
              onChange={(event) => {
                setMetaConsumo(event.target.value)
                setMensagemMeta('')
                setErroMeta('')
              }}
              disabled={carregandoMeta || salvandoMeta}
              placeholder={carregandoMeta ? 'Carregando...' : 'Ex.: 320'}
            />
          </label>

          <p className="settings-help">
            Limite de consumo somado de todos os aparelhos monitorados.
          </p>

          <label className="settings-tariff-field">
            Gasto máximo mensal (R$)
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={metaCusto}
              onChange={(event) => {
                setMetaCusto(event.target.value)
                setMensagemMeta('')
                setErroMeta('')
              }}
              disabled={carregandoMeta || salvandoMeta}
              placeholder={carregandoMeta ? 'Carregando...' : 'Ex.: 300,00'}
            />
          </label>

          <p className="settings-help">
            Limite financeiro estimado com base na tarifa cadastrada.
          </p>

          <div className="settings-actions">
            <button
              type="button"
              className="primary-action"
              onClick={salvarMetaMensal}
              disabled={carregandoMeta || salvandoMeta}
            >
              {salvandoMeta ? 'Salvando...' : 'Salvar metas'}
            </button>
          </div>

          {mensagemMeta && (
            <p className="settings-feedback success" role="status">
              {mensagemMeta}
            </p>
          )}

          {erroMeta && (
            <p className="settings-feedback error" role="alert">
              {erroMeta}
            </p>
          )}
        </div>
      </article>

    </section>
  )
}
