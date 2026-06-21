import ManagerPanel from './ManagerPanel.jsx';

// Внутрішня панель менеджера — окремий застосунок (порт 5174),
// дані тягне з того самого API (:4000), що й лендінг.
export default function App() {
  return (
    <div className="page">
      <header className="hero">
        <h1>Панель менеджера 🗂️</h1>
        <p>TOP Superfoods · заявки та доставка в CRM</p>
      </header>

      <main>
        <ManagerPanel />
      </main>

      <footer className="foot">
        Внутрішня панель (React) · дані з API :4000
      </footer>
    </div>
  );
}
