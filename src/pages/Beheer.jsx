import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, deleteDoc, doc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import WerkmomentForm from "../components/WerkmomentForm";

const STATUS_LABELS = {
  not_invoiced: "Nog niet gefactureerd",
  pending_invoice: "Factuur aangevraagd / in opmaak",
  invoiced: "Gefactureerd",
};
const STATUS_COLORS = {
  not_invoiced: "bg-orange-100 text-orange-800",
  pending_invoice: "bg-blue-100 text-blue-800",
  invoiced: "bg-green-100 text-green-800",
};

function formatDuur(min) {
  if (!min || min <= 0) return "—";
  return `${Math.floor(min / 60)}u ${String(min % 60).padStart(2, "0")}m`;
}

export default function Beheer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editLog, setEditLog] = useState(null);

  useEffect(() => {
    if (user === null) navigate("/login");
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "workLogs"), orderBy("date", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [user]);

  async function handleVerwijder(id) {
    if (!window.confirm("Ben je zeker dat je dit werkmoment wilt verwijderen?")) return;
    await deleteDoc(doc(db, "workLogs", id));
  }

  function handleBewerk(log) {
    setEditLog(log);
    setShowForm(true);
  }

  function handleNieuw() {
    setEditLog(null);
    setShowForm(true);
  }

  function handleFormSluit() {
    setShowForm(false);
    setEditLog(null);
  }

  async function handleUitloggen() {
    await signOut(auth);
    navigate("/");
  }

  if (user === undefined) return <p className="text-gray-500 mt-8 text-center">Laden...</p>;
  if (user === null) return null;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Beheer</h1>
          <p className="text-sm text-gray-500">Ingelogd als {user.email}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleNieuw}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 text-sm">
            + Nieuw werkmoment
          </button>
          <button onClick={handleUitloggen}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 text-sm">
            Uitloggen
          </button>
        </div>
      </div>

      {/* Formulier (modal) */}
      {showForm && (
        <WerkmomentForm log={editLog} onClose={handleFormSluit} userId={user.uid} />
      )}

      {/* Tabel */}
      {loading ? (
        <p className="text-gray-500 text-center py-8">Laden...</p>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">Nog geen werkmomenten.</p>
          <p className="text-sm">Klik op "+ Nieuw werkmoment" om te beginnen.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-gray-600 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Datum</th>
                <th className="text-left px-4 py-3">Uren</th>
                <th className="text-left px-4 py-3">Project / App</th>
                <th className="text-left px-4 py-3">Titel</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap font-medium">
                    {log.entryType === "period"
                      ? <><div>{log.dateFrom}</div><div className="text-xs text-gray-400">t/m {log.dateTo}</div></>
                      : log.date}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                    {log.entryType === "period"
                      ? <span className="text-xs italic text-gray-400">periode</span>
                      : <div>{log.startTime} – {log.endTime}</div>}
                    <div className="text-blue-600 font-medium">{formatDuur(log.durationMinutes)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{log.project}</div>
                    {log.appName && <div className="text-gray-400 text-xs">{log.appName}</div>}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <div>{log.title}</div>
                    {log.description && <div className="text-gray-400 text-xs mt-0.5 line-clamp-1">{log.description}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[log.status] || STATUS_COLORS.not_invoiced}`}>
                      {STATUS_LABELS[log.status] || STATUS_LABELS.not_invoiced}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button onClick={() => handleBewerk(log)}
                        className="text-blue-600 hover:underline text-xs font-medium">
                        Bewerken
                      </button>
                      <button onClick={() => handleVerwijder(log.id)}
                        className="text-red-500 hover:underline text-xs font-medium">
                        Verwijderen
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
