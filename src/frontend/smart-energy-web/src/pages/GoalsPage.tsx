
import { useEffect, useState } from 'react'
import {
  getProgressoMensal,
  type ProgressoMensal,
} from '../services/energyService'

function formatarNumero(valor: number, casas = 2): string {
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function formatarMes(data: string): string {
  const partes = data.slice(0, 10).split('-')

  if (partes.length !== 3) return data

  const ano = Number(partes[0])
  const mes = Number(partes[1])

  if (!ano || mes < 1 || mes > 12) return data

  const dataLocal = new Date(ano, mes - 1, 1)

  return dataLocal.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })
}

function obterSituacao(percentual: number) {
  if (percentual >= 100) {
    return {
      titulo: 'Meta ultrapassada',
      classe: 'goal-status exceeded',
      descricao: 'O limite definido para este mês foi atingido ou ultrapassado.',
    }
  }

  if (percentual >= 80) {
    return {
      titulo: 'Próximo do limite',
      classe: 'goal-status warning',
      descricao: 'O consumo já alcançou pelo menos 80% da meta mensal.',
    }
  }

  return {
    titulo: 'Dentro da meta',
    classe: 'goal-status normal',
    descricao: 'O valor calculado permanece abaixo de 80% do limite mensal.',
  }
}

type GoalCardProps = {
  titulo: string
  valorAtual: number
  meta: number
  percentual: number
  unidade: 'kWh' | 'R$'
}

function GoalCard({
  titulo,
  valorAtual,
  meta,
  percentual,
  unidade,
}: GoalCardProps) {
  const situacao = obterSituacao(percentual)
  const progressoVisual = Math.min(100, Math.max(0, percentual))
  const restante = Math.max(0, meta - valorAtual)

  const formatar = (valor: number) =>
    unidade === 'R$'
      ? formatarMoeda(valor)
      : `${formatarNumero(valor, 3)} kWh`

  return (
    <article className="form-panel goal-progress-card">
      <div className="goal-card-heading">
        <div>
          <p className="eyebrow">Meta mensal</p>
          <h2>{titulo}</h2>
        </div>

        <span className={situacao.classe}>
          {situacao.titulo}
        </span>
      </div>

      <div className="goal-current-value">
        <strong>
          {formatar(valorAtual)}
        </strong>
        <span>
          de {formatar(meta)}
        </span>
      </div>

      <div
        className="goal-progress-track"
        role="progressbar"
        aria-label={`Progresso da meta de ${titulo}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(100, percentual)}
        aria-valuetext={`${formatarNumero(percentual)}% da meta`}
      >
        <div
          className={`goal-progress-fill ${
            percentual >= 100 ? 'exceeded' : ''
          }`}
          style={{ width: `${progressoVisual}%` }}
        />
      </div>

      <div className="goal-progress-labels">
        <strong>{formatarNumero(percentual)}%</strong>
        <span>
          {percentual >= 100
            ? `${formatar(valorAtual - meta)} acima do limite`
            : `${formatar(restante)} restantes`}
        </span>
      </div>

      <p className="goal-card-description">
        {situacao.descricao}
      </p>
    </article>
  )
}

export default function GoalsPage() {
  const [dados, setDados] = useState<ProgressoMensal | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function carregarProgresso() {
      try {
        const resultado = await getProgressoMensal()
        setDados(resultado)
      } catch (error) {
        setErro(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar o progresso mensal.',
        )
      } finally {
        setCarregando(false)
      }
    }

    void carregarProgresso()
  }, [])

  return (
    <section className="content-page goals-page">
      <div className="page-heading">
        <p className="eyebrow">Metas e cotas</p>
        <h1>Controle de metas</h1>
        <p className="header-copy">
          Acompanhe o consumo e o custo acumulados da residência em relação
          aos limites definidos para o mês.
        </p>
      </div>

      {carregando && (
        <div className="form-panel goals-message" role="status">
          Carregando o progresso mensal...
        </div>
      )}

      {!carregando && erro && (
        <div className="form-panel goals-message goals-error" role="alert">
          <strong>Não foi possível carregar as metas.</strong>
          <p>{erro}</p>
          <button
            type="button"
            className="primary-action"
            onClick={() => window.location.reload()}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!carregando && !erro && dados && (
        <>
          <div className="goals-period">
            <div>
              <p className="eyebrow">Período de referência</p>
              <h2>{formatarMes(dados.mesReferencia)}</h2>
            </div>
            <span className="goals-interval-count">
              {dados.quantidadeIntervalosValidos.toLocaleString('pt-BR')}
              {' '}intervalos válidos
            </span>
          </div>

          {!dados.metaConfigurada ||
          dados.metaConsumoKwh == null ||
          dados.metaCustoReais == null ||
          dados.percentualConsumo == null ||
          dados.percentualCusto == null ? (
            <div className="form-panel goals-message">
              <h2>Metas ainda não configuradas</h2>
              <p>
                Acesse Configurações para definir o limite mensal de consumo
                e o limite financeiro da residência.
              </p>
            </div>
          ) : (
            <>
              <div className="goals-progress-grid">
                <GoalCard
                  titulo="Consumo de energia"
                  valorAtual={dados.consumoMensalKwh}
                  meta={dados.metaConsumoKwh}
                  percentual={dados.percentualConsumo}
                  unidade="kWh"
                />

                <GoalCard
                  titulo="Custo estimado"
                  valorAtual={dados.custoMensalReais}
                  meta={dados.metaCustoReais}
                  percentual={dados.percentualCusto}
                  unidade="R$"
                />
              </div>

              <article className="form-panel goals-methodology">
                <h2>Como os valores são calculados</h2>
                <p>
                  O consumo considera intervalos válidos entre medições
                  dos aparelhos da residência. O custo é estimado usando
                  a tarifa ativa cadastrada na plataforma.
                </p>
                <p>
                  Períodos sem medições válidas não são estimados. Por isso,
                  os valores representam o consumo calculado a partir dos
                  dados disponíveis, e não necessariamente todo o consumo
                  real do mês.
                </p>
              </article>
            </>
          )}
        </>
      )}
    </section>
  )
}

