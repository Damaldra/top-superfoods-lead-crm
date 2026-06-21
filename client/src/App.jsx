import LeadForm from './LeadForm.jsx';

// Лендінг — публічний застосунок із формою заявки.
// Панель менеджера винесено в окремий застосунок (../manager, порт 5174).
export default function App() {
  return (
    <div className="page">
      <header className="hero">
        <h1>TOP Superfoods 🌱</h1>
        <p>Продукти для здоровʼя та якості життя. Залиште заявку — менеджер звʼяжеться з вами.</p>
      </header>

      <main>
        <LeadForm />
      </main>

      <footer className="foot">
        Лендінг (React) · заявка → API :4000 → CRM
      </footer>
    </div>
  );
}
