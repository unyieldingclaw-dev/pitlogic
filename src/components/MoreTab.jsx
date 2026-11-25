export default function MoreTab({ onSelect }) {
  return (
    <section className="fadein">
      <h1 className="flow-title">More</h1>
      <div className="flow-menu">
        {[
          ['devices', 'Devices', 'Connect probes and check current readings'],
          ['guide', 'Guides', 'Cooking temperatures and reference guides'],
          ['recipes', 'Recipes', 'Your rubs, sauces and other recipes'],
          ['analytics', 'Stats', 'Review your cooking history'],
          ['settings', 'Settings', 'Preferences, backup and restore'],
        ].map(([id, label, description]) => (
          <button key={id} type="button" className="card card-interactive flow-menu-item" aria-label={label} onClick={() => onSelect(id)}>
            <span>{label}</span><small>{description}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
