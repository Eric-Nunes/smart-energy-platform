import type { ResidenceUnit } from '../services/energyService'

type ProfilePageProps = {
  units: ResidenceUnit[]
  selectedUnitId: string
  selectedUnit: ResidenceUnit
  onSelectUnit: (unitId: string) => void
  onUpdateUnit: (unitId: string, updates: Partial<Omit<ResidenceUnit, 'rooms'>>) => void
  onAddUnit: () => void
  onAddRoom: (unitId: string) => void
  onUpdateRoom: (unitId: string, roomId: string, name: string) => void
  onSave: () => void
}

export default function ProfilePage({
  units,
  selectedUnitId,
  selectedUnit,
  onSelectUnit,
  onUpdateUnit,
  onAddUnit,
  onAddRoom,
  onUpdateRoom,
  onSave,
}: ProfilePageProps) {
  return (
    <section className="content-page">
      <div className="page-heading">
        <p className="eyebrow">Seu perfil</p>
        <h1>Dados da residência</h1>
        <p className="header-copy">
          Organize residências, cômodos e dados do responsável usados nas estimativas da plataforma.
        </p>
      </div>

      <div className="profile-layout">
        <article className="form-panel unit-list-panel">
          <div className="panel-heading-inline">
            <h2>Residências cadastradas</h2>
            <button className="icon-action" onClick={onAddUnit} type="button">+ Adicionar</button>
          </div>

          <div className="unit-list">
            {units.map((unit) => (
              <button
                className={selectedUnitId === unit.id ? 'active' : ''}
                key={unit.id}
                onClick={() => onSelectUnit(unit.id)}
                type="button"
              >
                <strong>{unit.name}</strong>
                <span>{unit.city || 'Cidade não informada'}</span>
              </button>
            ))}
          </div>
        </article>

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
            <div className="panel-heading-inline">
              <h2>{selectedUnit.name}</h2>
              <button className="icon-action" onClick={() => onAddRoom(selectedUnit.id)} type="button">+ Cômodo</button>
            </div>

            <div className="form-grid two-columns">
              <label>
                Nome da unidade
                <input
                  onChange={(event) => onUpdateUnit(selectedUnit.id, { name: event.target.value })}
                  type="text"
                  value={selectedUnit.name}
                />
              </label>
              <label>
                Estado
                <input
                  onChange={(event) => onUpdateUnit(selectedUnit.id, { state: event.target.value })}
                  type="text"
                  value={selectedUnit.state}
                />
              </label>
              <label>
                Cidade
                <input
                  onChange={(event) => onUpdateUnit(selectedUnit.id, { city: event.target.value })}
                  type="text"
                  value={selectedUnit.city}
                />
              </label>
              <label>
                Moradores
                <input
                  min="1"
                  onChange={(event) => onUpdateUnit(selectedUnit.id, { residents: Number(event.target.value) })}
                  type="number"
                  value={selectedUnit.residents}
                />
              </label>
            </div>

            <div className="room-grid">
              {selectedUnit.rooms.map((room) => (
                <label key={room.id}>
                  Cômodo
                  <input
                    onChange={(event) => onUpdateRoom(selectedUnit.id, room.id, event.target.value)}
                    type="text"
                    value={room.name}
                  />
                </label>
              ))}
            </div>
          </article>

          <article className="profile-summary">
            <span>Meta mensal atual</span>
            <strong>320 kWh</strong>
            <p>Baseada no histórico da unidade selecionada e no perfil informado.</p>
          </article>

          <article className="profile-summary">
            <span>Smart plugs cadastradas</span>
            <strong>6</strong>
            <p>Dispositivos usados para separar o consumo por aparelho e cômodo.</p>
          </article>
        </div>
      </div>

      <div className="form-actions">
        <button className="primary-action" onClick={onSave} type="button">Salvar dados</button>
      </div>
    </section>
  )
}
