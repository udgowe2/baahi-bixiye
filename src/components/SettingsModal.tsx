import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Package, Loader2 } from "lucide-react";

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [pantry, setPantry] = useState<string[]>([]);
  const [newItem, setNewItem] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data?.pantry)) setPantry(data.pantry);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async (next: string[]) => {
    setPantry(next);
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "pantry", value: next }),
      });
    } catch {
      /* nicht kritisch – lokal bleibt es sichtbar */
    } finally {
      setSaving(false);
    }
  };

  const addItem = () => {
    const v = newItem.trim();
    if (v && !pantry.some(p => p.toLowerCase() === v.toLowerCase())) {
      save([...pantry, v]);
    }
    setNewItem("");
  };

  const removeItem = (item: string) => save(pantry.filter(p => p !== item));

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg max-h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
              <Package size={20} />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-gray-800">Vorratskammer</h2>
              <p className="text-xs text-gray-500 font-medium">Zählt nicht als Einkauf – die KI darf es frei verwenden</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors">
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4 overflow-y-auto">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Zutat hinzufügen (z.B. Reis, Gewürze)"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addItem(); }}
              className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            <button
              onClick={addItem}
              disabled={!newItem.trim()}
              className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all"
            >
              <Plus size={20} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-400">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {pantry.length === 0 && (
                <p className="text-sm text-gray-400 italic py-4">Noch keine Vorräte eingetragen.</p>
              )}
              {pantry.map(item => (
                <span key={item} className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 pl-3 pr-2 py-1.5 rounded-full text-sm font-medium group">
                  {item}
                  <button onClick={() => removeItem(item)} className="text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </span>
              ))}
            </div>
          )}
          {saving && <p className="text-xs text-gray-400">Wird gespeichert…</p>}
        </div>
      </div>
    </div>
  );
};
