import { useCallback, useEffect, useState, type FormEventHandler } from 'react'
import {
  createAparelho,
  deleteAparelho,
  getAparelhos,
  updateAparelho,
  type Aparelho,
} from '../services/energyService'

import '../DevicesPage.css'

function mensagemErro(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Ocorreu um erro inesperado ao executar a operação.'
}

function formatarData(data: string): string {
  if (!data) return 'Data não informada'
  const valor = new Date(data)
  return Number.isNaN(valor.getTime())
    ? 'Data não informada'
    : valor.toLocaleDateString('pt-BR')
}

export default function DevicesPage() {
  const [aparelhos, setAparelhos] = useState<Aparelho[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [excluindoId, setExcluindoId] = useState<number | null>(null)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [nome, setNome] = useState('')
  const [localizacao, setLocalizacao] = useState('')
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')

  const carregarAparelhos = useCallback(async () => {
    setCarregando(true)
    setErro('')

    try {
      const resultado = await getAparelhos()
      setAparelhos(resultado)
    } catch (error) {
      setErro(mensagemErro(error))
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void carregarAparelhos()
  }, [carregarAparelhos])

  function limparFormulario() {
    setNome('')
    setLocalizacao('')
    setEditandoId(null)
  }

  function iniciarEdicao(aparelho: Aparelho) {
    setNome(aparelho.nomeAparelho)
    setLocalizacao(aparelho.localizacao ?? '')
    setEditandoId(aparelho.id)
    setErro('')
    setMensagem('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const salvarAparelho: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()
    setErro('')
    setMensagem('')

    const nomeNormalizado = nome.trim()
    const localizacaoNormalizada = localizacao.trim()

    if (!nomeNormalizado) {
      setErro('Informe o nome do aparelho.')
      return
    }

    if (nomeNormalizado.length > 100) {
      setErro('O nome deve ter no máximo 100 caracteres.')
      return
    }

    if (localizacaoNormalizada.length > 100) {
      setErro('A localização deve ter no máximo 100 caracteres.')
      return
    }

    setSalvando(true)

    const dados = {
      nomeAparelho: nomeNormalizado,
      localizacao: localizacaoNormalizada || null,
    }

    try {
      if (editandoId !== null) {
        await updateAparelho(editandoId, dados)
        setMensagem('Aparelho atualizado com sucesso.')
      } else {
        await createAparelho(dados)
        setMensagem('Aparelho cadastrado com sucesso.')
      }

      limparFormulario()
      await carregarAparelhos()
    } catch (error) {
      setErro(mensagemErro(error))
    } finally {
      setSalvando(false)
    }
  }

  async function excluirAparelho(aparelho: Aparelho) {
    const confirmou = window.confirm(
      `Deseja realmente excluir o aparelho "${aparelho.nomeAparelho}"? Essa ação não poderá ser desfeita.`,
    )
    if (!confirmou) return

    setErro('')
    setMensagem('')
    setExcluindoId(aparelho.id)

    try {
      await deleteAparelho(aparelho.id)
      setMensagem('Aparelho excluído com sucesso.')
      if (editandoId === aparelho.id) limparFormulario()
      await carregarAparelhos()
    } catch (error) {
      setErro(mensagemErro(error))
    } finally {
      setExcluindoId(null)
    }
  }

  return (
    <section className="content-page devices-page">
      <div className="page-heading">
        <p className="eyebrow">Gestão de aparelhos</p>
        <h1>Aparelhos cadastrados</h1>
        <p className="header-copy">
          Cadastre e organize os equipamentos acompanhados pela plataforma SmartEnergy.
        </p>
      </div>

      <section className="form-panel devices-form-panel">
        <div className="devices-section-heading">
          <div>
            <h2>{editandoId !== null ? 'Editar aparelho' : 'Cadastrar aparelho'}</h2>
            <p>Informe o nome e, se desejar, o local onde o aparelho está instalado.</p>
          </div>
          {editandoId !== null && (
            <button className="devices-button devices-button-secondary" type="button" onClick={limparFormulario}>
              Cancelar edição
            </button>
          )}
        </div>

        <form onSubmit={salvarAparelho}>
          <div className="form-grid two-columns devices-form-grid">
            <label>
              Nome do aparelho
              <input
                type="text"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                placeholder="Ex.: Televisão"
                maxLength={100}
                required
              />
            </label>
            <label>
              Localização <span className="devices-optional">(opcional)</span>
              <input
                type="text"
                value={localizacao}
                onChange={(event) => setLocalizacao(event.target.value)}
                placeholder="Ex.: Sala de estar"
                maxLength={100}
              />
            </label>
          </div>
          <div className="devices-form-actions">
            <button className="devices-button devices-button-primary" type="submit" disabled={salvando}>
              {salvando
                ? 'Salvando...'
                : editandoId !== null
                  ? 'Salvar alterações'
                  : 'Cadastrar aparelho'}
            </button>
          </div>
        </form>
      </section>

      {erro && <p className="error-message devices-feedback" role="alert">{erro}</p>}
      {mensagem && <p className="success-message devices-feedback" role="status">{mensagem}</p>}

      <section className="devices-list-section">
        <div className="devices-section-heading">
          <div>
            <h2>Seus aparelhos</h2>
            <p>{aparelhos.length} {aparelhos.length === 1 ? 'aparelho cadastrado' : 'aparelhos cadastrados'}</p>
          </div>
          <button className="devices-button devices-button-secondary" type="button" onClick={() => void carregarAparelhos()} disabled={carregando}>
            Atualizar lista
          </button>
        </div>

        {carregando ? (
          <div className="devices-empty-state">Carregando aparelhos...</div>
        ) : aparelhos.length === 0 ? (
          <div className="devices-empty-state">
            <strong>Nenhum aparelho cadastrado</strong>
            <span>Utilize o formulário acima para adicionar o primeiro aparelho.</span>
          </div>
        ) : (
          <div className="devices-list">
            {aparelhos.map((aparelho) => (
              <article className="devices-list-card" key={aparelho.id}>
                <div className="devices-list-info">
                  <div className="devices-device-icon" aria-hidden="true">
                    <span>{aparelho.nomeAparelho.trim().charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <h3>{aparelho.nomeAparelho}</h3>
                    <p>{aparelho.localizacao || 'Localização não informada'}</p>
                    <span>Cadastrado em {formatarData(aparelho.dataCadastro)}</span>
                  </div>
                </div>
                <div className="devices-list-actions">
                  <button
                    className="devices-button devices-button-secondary"
                    type="button"
                    onClick={() => iniciarEdicao(aparelho)}
                    aria-label={`Editar ${aparelho.nomeAparelho}`}
                  >
                    Editar
                  </button>
                  <button
                    className="devices-button devices-button-danger"
                    type="button"
                    onClick={() => void excluirAparelho(aparelho)}
                    disabled={excluindoId === aparelho.id}
                    aria-label={`Excluir ${aparelho.nomeAparelho}`}
                  >
                    {excluindoId === aparelho.id ? 'Excluindo...' : 'Excluir'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}
