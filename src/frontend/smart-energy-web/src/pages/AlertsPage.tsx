const alerts = [
  'Ar-condicionado concentrou 32% do consumo do dia.',
  'Chuveiro ultrapassou o limite esperado no horário de pico.',
  'A projeção mensal está 8% abaixo da meta configurada.',
]

export default function AlertsPage() {
  return (
    <section className="content-page">
      <div className="page-heading">
        <p className="eyebrow">Alertas</p>
        <h1>Alertas inteligentes</h1>
        <p className="header-copy">Sinais importantes sobre picos, metas e comportamento energético.</p>
      </div>

      <div className="settings-list">
        {alerts.map((alert) => (
          <article className="alert-row" key={alert}>
            <span>{alert}</span>
          </article>
        ))}
      </div>
    </section>
  )
}
