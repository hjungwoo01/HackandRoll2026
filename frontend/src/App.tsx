import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AppShell } from './components/AppShell';
import { Feed } from './pages/Feed';
import { Upload } from './pages/Upload';
import { Collection } from './pages/Collection';
import { Leaderboard } from './pages/Leaderboard';

function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/feed" replace />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/collection" element={<Collection />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
        </Routes>
      </AppShell>
      <Toaster position="top-right" richColors />
    </BrowserRouter>
  );
}

export default App;
