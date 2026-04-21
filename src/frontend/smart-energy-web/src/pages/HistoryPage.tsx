const historyItems = [
  { period: 'Abril', consumption: '284 kWh', cost: 'R$ 258,44', status: 'Dentro da meta' },
  { period: 'Março', consumption: '301 kWh', cost: 'R$ 273,91', status: 'Atenção' },
  { period: 'Fevereiro', consumption: '276 kWh', cost: 'R$ 251,16', status: 'Dentro da meta' },
  { period: 'Janeiro', consumption: '318 kWh', cost: 'R$ 289,38', status: 'Acima da meta' },
]

export default function HistoryPage() {
  return (
    <section className="content-page">
      <div className="page-heading">
        <p className="eyebrow">Histórico</p>
        <h1>Histórico de consumo</h1>
        <p className="header-copy">Acompanhe a evolução mensal do consumo e dos custos estimados.</p>
      </div>

      <div className="data-table">
        {historyItems.map((item) => (
          <article key={item.period}>
            <strong>{item.period}</strong>
            <span>{item.consumption}</span>
            <span>{item.cost}</span>
            <small>{item.status}</small>
          </article>
        ))}
      </div>
    </section>
  )
}
