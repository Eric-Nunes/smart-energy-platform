export default function SettingsPage() {
  return (
    <section className="content-page">
      <div className="page-heading">
        <p className="eyebrow">Configurações</p>
        <h1>Preferências da plataforma</h1>
        <p className="header-copy">
          Ajuste tarifas, notificações e regras usadas nos cálculos da Smart Energy Platform.
        </p>
      </div>

      <div className="settings-grid">
        <article className="form-panel">
          <h2>Energia e custos</h2>
          <div className="form-grid two-columns">
            <label>
              Estado padrão
              <select defaultValue="SP">
                <option value="SP">São Paulo</option>
                <option value="RJ">Rio de Janeiro</option>
                <option value="MG">Minas Gerais</option>
                <option value="PR">Paraná</option>
              </select>
            </label>
            <label>
              Tarifa manual por kWh
              <input defaultValue="0,91" inputMode="decimal" type="text" />
            </label>
            <label>
              Meta mensal
              <input defaultValue="320" min="1" type="number" />
            </label>
            <label>
              Moeda
              <select defaultValue="BRL">
                <option value="BRL">Real brasileiro</option>
              </select>
            </label>
          </div>
        </article>

        <article className="form-panel">
          <h2>Alertas</h2>
          <div className="settings-list">
            <label className="toggle-row">
              <span>
                Alerta de pico de consumo
                <small>Notificar quando um aparelho passar do limite esperado.</small>
              </span>
              <input defaultChecked type="checkbox" />
            </label>
            <label className="toggle-row">
              <span>
                Risco de ultrapassar meta
                <small>Indicar quando a projeção mensal ficar acima da cota.</small>
              </span>
              <input defaultChecked type="checkbox" />
            </label>
            <label className="toggle-row">
              <span>
                Relatório semanal
                <small>Resumo com consumo, custo e dispositivos mais relevantes.</small>
              </span>
              <input type="checkbox" />
            </label>
          </div>
        </article>

        <article className="form-panel">
          <h2>Integração com smart plugs</h2>
          <div className="settings-list">
            <label className="toggle-row">
              <span>
                Sincronização automática
                <small>Atualizar leituras sem ação manual do usuário.</small>
              </span>
              <input defaultChecked type="checkbox" />
            </label>
            <label className="integration-field">
              Intervalo de leitura
              <select defaultValue="15">
                <option value="5">A cada 5 minutos</option>
                <option value="15">A cada 15 minutos</option>
                <option value="30">A cada 30 minutos</option>
                <option value="60">A cada 1 hora</option>
              </select>
            </label>
            <div className="integration-row">
              <span>Última leitura</span>
              <strong>Hoje, 14:30</strong>
            </div>
          </div>
        </article>
      </div>
    </section>
  )
}
