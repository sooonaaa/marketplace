import MainPage from './pages/MainPage';
import { AuthModalProvider } from './context/AuthModalContext';

function App() {
  return (
    <AuthModalProvider>
      <MainPage />
    </AuthModalProvider>
  );
}

export default App;