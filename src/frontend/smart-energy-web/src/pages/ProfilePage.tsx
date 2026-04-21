type ProfilePageProps = {
  unitName: string
  onUnitNameChange: (unitName: string) => void
}

export default function ProfilePage({ unitName, onUnitNameChange }: ProfilePageProps) {
  return (
    <section className="content-page">
      <div className="page-heading with-action">
        <div>
          <p className="eyebrow">Seu perfil</p>
          <h1>Dados da residência</h1>
          <p className="header-copy">
            Informações usadas para personalizar metas, alertas e estimativas de consumo.
          </p>
        </div>
        <button className="primary-action" type="button">Salvar dados</button>
      </div>

      <div className="profile-grid">
        <article className="form-panel">
          <h2>Responsável</h2>
          <div className="form-grid two-columns">
            <label>
              Nome
              <input defaultValue="Eric Nunes" type="text" />
            </label>
            <label>
              E-mail
              <input defaultValue="eric.nunes@email.com" type="email" />
            </label>
            <label>
              Telefone
              <input defaultValue="(11) 99999-0000" type="tel" />
            </label>
            <label>
              Perfil de uso
              <select defaultValue="residential">
                <option value="residential">Residencial</option>
                <option value="commercial">Comercial</option>
                <option value="mixed">Misto</option>
              </select>
            </label>
          </div>
        </article>

        <article className="form-panel">
          <h2>Residência</h2>
          <div className="form-grid two-columns">
            <label>
              Nome da unidade
              <input
                onChange={(event) => onUnitNameChange(event.target.value)}
                type="text"
                value={unitName}
              />
            </label>
            <label>
              Estado
              <select defaultValue="SP">
                <option value="SP">São Paulo</option>
                <option value="RJ">Rio de Janeiro</option>
                <option value="MG">Minas Gerais</option>
                <option value="PR">Paraná</option>
              </select>
            </label>
            <label>
              Cidade
              <input defaultValue="São Paulo" type="text" />
            </label>
            <label>
              Moradores
              <input defaultValue="4" min="1" type="number" />
            </label>
          </div>
        </article>

        <article className="profile-summary">
          <span>Meta mensal atual</span>
          <strong>320 kWh</strong>
          <p>Baseada no histórico residencial e no perfil informado.</p>
        </article>

        <article className="profile-summary">
          <span>Smart plugs cadastradas</span>
          <strong>6</strong>
          <p>Dispositivos usados para separar consumo por aparelho.</p>
        </article>
      </div>
    </section>
  )
}
