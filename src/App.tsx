import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Upload } from './pages/Upload';
import { Verify } from './pages/Verify';
import { Collection } from './pages/Collection';
import { Leaderboard } from './pages/Leaderboard';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Navigate to="/upload" replace />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/collection" element={<Collection />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
