import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { BookshelfPage } from './pages/BookshelfPage';
import { LectulandiaPage } from './pages/LectulandiaPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/bookshelf" replace />} />
          <Route path="/bookshelf" element={<BookshelfPage />} />
          {/* Placeholders for other routes */}
          <Route path="/favorites" element={<div className="p-8">Favorites</div>} />
          <Route path="/reading" element={<div className="p-8">Reading Now</div>} />
          <Route path="/to-read" element={<div className="p-8">To Read</div>} />
          <Route path="/quotes" element={<div className="p-8">Quotes</div>} />
          <Route path="/stats" element={<div className="p-8">Stats</div>} />
          <Route path="/settings" element={<div className="p-8">Settings</div>} />
          {/* Descubrir */}
          <Route path="/discover/lectulandia" element={<LectulandiaPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;