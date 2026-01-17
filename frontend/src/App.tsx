import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { AppShell } from './components/AppShell';
import { Feed } from './pages/Feed';
import { Upload } from './pages/Upload';
import { Collection } from './pages/Collection';
import { Leaderboard } from './pages/Leaderboard';
import { Auth } from './pages/Auth';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppShell>
                  <Routes>
                    <Route path="/" element={<Navigate to="/feed" replace />} />
                    <Route path="/feed" element={<Feed />} />
                    <Route path="/upload" element={<Upload />} />
                    <Route path="/collection" element={<Collection />} />
                    <Route path="/leaderboard" element={<Leaderboard />} />
                  </Routes>
                </AppShell>
              </ProtectedRoute>
            }
          />
        </Routes>
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
