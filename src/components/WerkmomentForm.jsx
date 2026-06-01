import { useState, useEffect } from "react";
import { collection, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";

const LEEG_FORM = {
  date: new Date().toISOString().split("T")[0],
  startTime: "09:00",
  endTime: "10:00",
  client: "",
  project: "",
  appName: "",
  workType: "development",
  title: "",
  description: "",
  logbookSectionTitle: "",
  logbookUrl: "",
  logbookText: "",
  externalType: "",
  externalLabel: "",
  externalUrl: "",
  status: "draft",
  validated: false,
};

function berekenDuur(start, einde) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = einde.split(":").map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

function formatDuur(min) {
  if (min <= 0) return null;
  return `${Math.floor(min / 60)}u ${String(min % 60).padStart(2, "0")}m`;
}

export default function WerkmomentForm({ log, onClose, userId }) {
  const [form, setForm] = useState(LEEG_FORM);
  const [fout, setFout] = useState("");
  const [bezig, setBezig] = useState(false);

  useEffect(() => {
    if (log) {
      setForm({
        date: log.date || "",
        startTime: log.startTime || "",
        endTime: log.endTime || "",
        client: log.client || "",
        project: log.project || "",
        appName: log.appName || "",
        workType: log.workType || "development",
        title: log.title || "",
        description: log.description || "",
        logbookSectionTitle: log.logbookReference?.sectionTitle || "",
        logbookUrl: log.logbookReference?.url || "",
        logbookText: log.logbookReference?.text || "",
        externalType: log.externalReference?.type || "",
        externalLabel: log.externalReference?.label || "",
        externalUrl: log.externalReference?.url || "",
        status: log.status || "draft",
        validated: log.validated || false,
      });
    }
  }, [log]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((v) => ({ ...v, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleOpslaan(e) {
    e.preventDefault();
    setFout("");

    const duur = berekenDuur(form.startTime, form.endTime);
    if (duur <= 0) {
      setFout("Het einduur moet na het startuur liggen.");
      return;
    }
    if (!form.date || !form.project || !form.title) {
      setFout("Datum, project en titel zijn verplicht.");
      return;
    }

    setBezig(true);
    const data = {
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      durationMinutes: duur,
      client: form.client,
      project: form.project,
      appName: form.appName,
      workType: form.workType,
      title: form.title,
      description: form.description,
      logbookReference: {
        sectionTitle: form.logbookSectionTitle,
        url: form.logbookUrl,
        text: form.logbookText,
      },
      externalReference: {
        type: form.externalType,
        label: form.externalLabel,
        url: form.externalUrl,
      },
      status: form.status,
      validated: form.validated,
      updatedAt: serverTimestamp(),
    };

    try {
      if (log) {
        await updateDoc(doc(db, "workLogs", log.id), data);
      } else {
        await addDoc(collection(db, "workLogs"), {
          ...data,
          createdAt: serverTimestamp(),
          createdBy: userId,
        });
      }
      onClose();
    } catch {
      setFout("Er is een fout opgetreden bij het opslaan. Probeer opnieuw.");
    } finally {
      setBezig(false);
    }
  }

  const duur = berekenDuur(form.startTime, form.endTime);
  const duurTekst = formatDuur(duur);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">
            {log ? "Werkmoment bewerken" : "Nieuw werkmoment"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleOpslaan} className="px-6 py-5 space-y-5">

          {fout && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {fout}
            </div>
          )}

          {/* Datum en tijd */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Datum en tijd</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Datum <span className="text-red-500">*</span></label>
                <input type="date" name="date" value={form.date} onChange={handleChange} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Startuur <span className="text-red-500">*</span></label>
                <input type="time" name="startTime" value={form.startTime} onChange={handleChange} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Einduur <span className="text-red-500">*</span></label>
                <input type="time" name="endTime" value={form.endTime} onChange={handleChange} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            {duurTekst && (
              <p className="text-sm text-blue-600 mt-2">Totale duur: <strong>{duurTekst}</strong></p>
            )}
            {duur <= 0 && form.startTime && form.endTime && (
              <p className="text-sm text-red-500 mt-2">Einduur ligt voor startuur.</p>
            )}
          </div>

          {/* Project */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Project</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Klant</label>
                <input type="text" name="client" value={form.client} onChange={handleChange}
                  placeholder="bv. Coupon Solutions"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project <span className="text-red-500">*</span></label>
                <input type="text" name="project" value={form.project} onChange={handleChange} required
                  placeholder="bv. Swipedrinks"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">App / onderdeel</label>
                <input type="text" name="appName" value={form.appName} onChange={handleChange}
                  placeholder="bv. Kassa-app"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type werk</label>
                <select name="workType" value={form.workType} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="development">Development</option>
                  <option value="design">Design</option>
                  <option value="meeting">Overleg</option>
                  <option value="testing">Testen</option>
                  <option value="documentation">Documentatie</option>
                  <option value="other">Andere</option>
                </select>
              </div>
            </div>
          </div>

          {/* Omschrijving */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Omschrijving</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titel <span className="text-red-500">*</span></label>
                <input type="text" name="title" value={form.title} onChange={handleChange} required
                  placeholder="Korte titel van het werkmoment"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beschrijving</label>
                <textarea name="description" value={form.description} onChange={handleChange}
                  rows={3} placeholder="Wat heb je gedaan?"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
          </div>

          {/* Logboekverwijzing */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Logboekverwijzing <span className="font-normal normal-case">(optioneel)</span></h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sectietitel</label>
                <input type="text" name="logbookSectionTitle" value={form.logbookSectionTitle} onChange={handleChange}
                  placeholder="bv. Kassapunten en menu's"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                <input type="url" name="logbookUrl" value={form.logbookUrl} onChange={handleChange}
                  placeholder="https://..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tekst uit logboek</label>
              <textarea name="logbookText" value={form.logbookText} onChange={handleChange}
                rows={6}
                placeholder="Plak hier de relevante tekst uit je logboek..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y font-mono" />
            </div>
          </div>

          {/* Externe verwijzing */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Externe verwijzing <span className="font-normal normal-case">(optioneel)</span></h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select name="externalType" value={form.externalType} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Geen</option>
                  <option value="commit">GitHub commit</option>
                  <option value="ticket">Ticket</option>
                  <option value="document">Document</option>
                  <option value="changelog">Changelog</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                <input type="text" name="externalLabel" value={form.externalLabel} onChange={handleChange}
                  placeholder="bv. Commit #abc123"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                <input type="url" name="externalUrl" value={form.externalUrl} onChange={handleChange}
                  placeholder="https://..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Status</h3>
            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select name="status" value={form.status} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="draft">Concept</option>
                  <option value="final">Definitief</option>
                  <option value="reviewed">Nagekeken</option>
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer pb-2">
                  <input type="checkbox" name="validated" checked={form.validated} onChange={handleChange}
                    className="w-4 h-4 rounded" />
                  Gevalideerd / nagekeken
                </label>
              </div>
            </div>
          </div>

          {/* Knoppen */}
          <div className="flex justify-end gap-3 border-t pt-4">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium">
              Annuleren
            </button>
            <button type="submit" disabled={bezig}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
              {bezig ? "Opslaan..." : log ? "Wijzigingen opslaan" : "Werkmoment opslaan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
