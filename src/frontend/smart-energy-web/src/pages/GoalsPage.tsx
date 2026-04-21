export default function GoalsPage() {
  return (
    <section className="content-page">
      <div className="page-heading">
        <p className="eyebrow">Metas e cotas</p>
        <h1>Controle de metas</h1>
        <p className="header-copy">Defina cotas de consumo e acompanhe a projeção mensal.</p>
      </div>

      <div className="profile-grid">
        <article className="form-panel">
          <h2>Cota mensal</h2>
          <div className="form-grid two-columns">
            <label>
              Limite de consumo
              <input defaultValue="320" min="1" type="number" />
            </label>
            <label>
              Limite financeiro
              <input defaultValue="290,00" inputMode="decimal" type="text" />
            </label>
          </div>
        </article>

        <article className="profile-summary">
          <span>Projeção atual</span>
          <strong>89%</strong>
          <p>Você está próximo da meta, mas ainda dentro do limite definido.</p>
        </article>
      </div>
    </section>
  )
}
