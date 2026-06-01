import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase/config";

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

function formatDuur(minuten) {
  if (!minuten || minuten <= 0) return "—";
  return `${Math.floor(minuten / 60)}u ${String(minuten % 60).padStart(2, "0")}m`;
}

export default function Overzicht() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterProject, setFilterProject] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterVanaf, setFilterVanaf] = useState("");
  const [filterTot, setFilterTot] = useState("");

  useEffect(() => {
    const q = query(collection(db, "workLogs"), orderBy("date", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const projecten = [...new Set(logs.map((l) => l.project).filter(Boolean))].sort();

  const gefilterd = logs.filter((l) => {
    if (filterProject && l.project !== filterProject) return false;
    if (filterStatus && l.status !== filterStatus) return false;
    if (filterVanaf && l.date < filterVanaf) return false;
    if (filterTot && l.date > filterTot) return false;
    return true;
  });

  const totaalMinuten = gefilterd.reduce((som, l) => som + (l.durationMinutes || 0), 0);

  if (loading) return <p className="text-gray-500 mt-8 text-center">Laden...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-5 text-gray-800">Werkuren overzicht</h1>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Project</label>
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white"
          >
            <option value="">Alle projecten</option>
            {projecten.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white"
          >
            <option value="">Alle statussen</option>
            <option value="not_invoiced">Nog niet gefactureerd</option>
            <option value="pending_invoice">Factuur aangevraagd / in opmaak</option>
            <option value="invoiced">Gefactureerd</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Vanaf</label>
          <input type="date" value={filterVanaf} onChange={(e) => setFilterVanaf(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tot en met</label>
          <input type="date" value={filterTot} onChange={(e) => setFilterTot(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm" />
        </div>
        {(filterProject || filterStatus || filterVanaf || filterTot) && (
          <button
            onClick={() => { setFilterProject(""); setFilterStatus(""); setFilterVanaf(""); setFilterTot(""); }}
            className="text-sm text-blue-600 hover:underline self-end pb-1.5"
          >
            Filters wissen
          </button>
        )}
      </div>

      {/* Totaalbalk */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4 flex justify-between items-center">
        <span className="text-sm text-blue-800">
          <strong>{gefilterd.length}</strong> werkmoment{gefilterd.length !== 1 ? "en" : ""} geselecteerd
        </span>
        <span className="text-sm font-semibold text-blue-800">
          Totaal: {formatDuur(totaalMinuten)}
        </span>
      </div>

      {/* Tabel */}
      {gefilterd.length === 0 ? (
        <p className="text-gray-500 text-center py-8">Geen werkmomenten gevonden.</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-gray-600 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Datum</th>
                <th className="text-left px-4 py-3">Start</th>
                <th className="text-left px-4 py-3">Einde</th>
                <th className="text-left px-4 py-3">Totaal</th>
                <th className="text-left px-4 py-3">Project / App</th>
                <th className="text-left px-4 py-3">Omschrijving</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {gefilterd.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap font-medium">
                    {log.entryType === "period"
                      ? <><div>{log.dateFrom}</div><div className="text-xs text-gray-400">t/m {log.dateTo}</div></>
                      : log.date}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                    {log.entryType === "period" ? <span className="text-xs italic text-gray-400">periode</span> : log.startTime}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                    {log.entryType === "period" ? "" : log.endTime}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-medium text-blue-700">{formatDuur(log.durationMinutes)}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{log.project}</div>
                    {log.appName && <div className="text-gray-400 text-xs">{log.appName}</div>}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <div className="font-medium">{log.title}</div>
                    {log.description && (
                      log.description.length > 120 ? (
                        <details className="mt-0.5">
                          <summary className="text-xs text-gray-500 cursor-pointer list-none">
                            {log.description.slice(0, 120)}…
                            <span className="text-blue-400 hover:text-blue-600 ml-1">meer</span>
                          </summary>
                          <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{log.description}</p>
                        </details>
                      ) : (
                        <p className="text-xs text-gray-500 mt-0.5">{log.description}</p>
                      )
                    )}
                    {log.logbookReference?.sectionTitle && (
                      <div className="text-xs text-indigo-600 mt-0.5">📖 {log.logbookReference.sectionTitle}</div>
                    )}
                    {log.logbookReference?.text && (
                      <details className="mt-1">
                        <summary className="text-xs text-indigo-400 cursor-pointer hover:text-indigo-600">Logboektekst tonen</summary>
                        <pre className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-2 mt-1 whitespace-pre-wrap font-sans max-h-40 overflow-y-auto">{log.logbookReference.text}</pre>
                      </details>
                    )}
                    {log.externalReference?.url && (
                      <a href={log.externalReference.url} target="_blank" rel="noreferrer"
                        className="text-xs text-blue-500 hover:underline mt-0.5 block">
                        🔗 {log.externalReference.label || "Link"}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[log.status] || STATUS_COLORS.not_invoiced}`}>
                      {STATUS_LABELS[log.status] || STATUS_LABELS.not_invoiced}
                    </span>
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
