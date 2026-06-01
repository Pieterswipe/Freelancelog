import { BrowserRouter, Routes, Route, Link, NavLink } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "./firebase/config";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Overzicht from "./pages/Overzicht";
import Login from "./pages/Login";
import Beheer from "./pages/Beheer";

function Navigatie() {
  const { user } = useAuth();

  const linkClass = ({ isActive }) =>
    isActive
      ? "text-white font-semibold border-b-2 border-white pb-0.5"
      : "text-blue-100 hover:text-white";

  return (
    <nav className="bg-blue-700 text-white px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <Link to="/" className="font-bold text-lg tracking-tight">
          FreelanceLog
        </Link>
        <div className="flex items-center gap-5 text-sm">
          <NavLink to="/" end className={linkClass}>Overzicht</NavLink>
          {user ? (
            <>
              <NavLink to="/beheer" className={linkClass}>Beheer</NavLink>
              <button
                onClick={() => signOut(auth)}
                className="text-blue-200 hover:text-white text-sm"
              >
                Uitloggen
              </button>
            </>
          ) : (
            <NavLink to="/login" className={linkClass}>Inloggen</NavLink>
          )}
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <Navigatie />
          <main className="max-w-5xl mx-auto px-4 py-6">
            <Routes>
              <Route path="/" element={<Overzicht />} />
              <Route path="/login" element={<Login />} />
              <Route path="/beheer" element={<Beheer />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
