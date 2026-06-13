import React, { useState } from "react";
import { WeekPlanSlot, WeekPlanResult, MealType, DAYS } from "../types";
import { X, Sparkles, RefreshCw, ShoppingBasket, Recycle, Check, Loader2 } from "lucide-react";
import { motion } from "motion/react";

interface WeekPlannerModalProps {
  weekStart: Date;
  onApply: (slots: WeekPlanSlot[]) => Promise<void>;
  onClose: () => void;
}

const MEAL_LABEL: Record<string, string> = { lunch: "Mittagessen", dinner: "Abendessen" };

export const WeekPlannerModal: React.FC<WeekPlannerModalProps> = ({ weekStart, onApply, onClose }) => {
  const [meals, setMeals] = useState<MealType[]>(["dinner"]);
  const [variety, setVariety] = useState(50);
  const [result, setResult] = useState<WeekPlanResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [rerollKey, setRerollKey] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const toggleMeal = (m: MealType) => {
    setMeals(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  const generate = async () => {
    if (meals.length === 0) return;
    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meals, variety }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (err: any) {
      alert("Fehler beim Erstellen des Wochenplans: " + (err.message || "Unbekannt"));
    } finally {
      setIsGenerating(false);
    }
  };

  const rerollSlot = async (slot: WeekPlanSlot) => {
    if (!result) return;
    const key = `${slot.dayIndex}-${slot.mealType}`;
    setRerollKey(key);
    try {
      const avoidTitles = result.slots.map(s => s.recipe.title);
      const res = await fetch("/api/generate-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mealType: slot.mealType, avoidTitles }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult({
        ...result,
        slots: result.slots.map(s =>
          (s.dayIndex === slot.dayIndex && s.mealType === slot.mealType)
            ? { ...s, recipe: data.recipe, isNew: data.isNew }
            : s
        ),
      });
    } catch (err: any) {
      alert("Neu würfeln fehlgeschlagen: " + (err.message || "Unbekannt"));
    } finally {
      setRerollKey(null);
    }
  };

  const apply = async () => {
    if (!result) return;
    setIsApplying(true);
    try {
      await onApply(result.slots);
      onClose();
    } catch {
      alert("Übernehmen fehlgeschlagen.");
    } finally {
      setIsApplying(false);
    }
  };

  const newCount = result?.slots.filter(s => s.isNew).length || 0;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-gray-800">Woche planen</h2>
              <p className="text-xs text-gray-500 font-medium">KI plant clever & spart beim Einkauf</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors">
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {!result ? (
            <>
              {/* Mahlzeiten-Auswahl */}
              <div className="flex flex-col gap-3">
                <label className="text-sm font-bold text-gray-700">Welche Mahlzeiten?</label>
                <div className="flex gap-3">
                  {(["lunch", "dinner"] as MealType[]).map(m => (
                    <button
                      key={m}
                      onClick={() => toggleMeal(m)}
                      className={`flex-1 py-3 rounded-2xl border-2 font-bold text-sm transition-all ${
                        meals.includes(m)
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                          : "border-gray-200 text-gray-400 hover:border-gray-300"
                      }`}
                    >
                      {meals.includes(m) && <Check size={14} className="inline mr-1" />}
                      {MEAL_LABEL[m]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vielfalt-Regler */}
              <div className="flex flex-col gap-3">
                <label className="text-sm font-bold text-gray-700">Worauf liegt der Fokus?</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={variety}
                  onChange={(e) => setVariety(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <div className="flex justify-between text-xs font-bold">
                  <span className={variety <= 33 ? "text-indigo-600" : "text-gray-400"}>🛒 Sparsam einkaufen</span>
                  <span className={variety >= 67 ? "text-indigo-600" : "text-gray-400"}>Abwechslung 🌈</span>
                </div>
              </div>

              <button
                onClick={generate}
                disabled={isGenerating || meals.length === 0}
                className="mt-2 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isGenerating ? <><Loader2 size={18} className="animate-spin" /> KI plant die Woche…</> : <><Sparkles size={18} /> Wochenplan erstellen</>}
              </button>
            </>
          ) : (
            <>
              {/* Einkaufs-Badge */}
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-emerald-700 font-bold">
                  <ShoppingBasket size={20} />
                  <span>Dieser Plan braucht ca. {result.count} verschiedene Produkte</span>
                </div>
                {result.shared.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {result.shared.map((s, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-xs bg-white text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-100 font-medium">
                        <Recycle size={12} /> {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Tagesweise Vorschau */}
              <div className="flex flex-col gap-3">
                {DAYS.map((day, dayIndex) => {
                  const daySlots = result.slots.filter(s => s.dayIndex === dayIndex);
                  if (daySlots.length === 0) return null;
                  return (
                    <div key={day} className="border border-gray-100 rounded-2xl p-4">
                      <p className="font-serif italic text-gray-700 mb-2">{day}</p>
                      <div className="flex flex-col gap-2">
                        {daySlots.map(slot => {
                          const key = `${slot.dayIndex}-${slot.mealType}`;
                          return (
                            <div key={key} className="flex items-center gap-3 bg-gray-50 rounded-xl p-2.5">
                              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 w-16 shrink-0">{MEAL_LABEL[slot.mealType]}</span>
                              <span className="flex-1 text-sm font-bold text-gray-700 truncate">{slot.recipe.title}</span>
                              {slot.isNew && <span className="text-[9px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-bold shrink-0">NEU</span>}
                              <button
                                onClick={() => rerollSlot(slot)}
                                disabled={rerollKey === key}
                                className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors shrink-0"
                                title="Anderes Gericht"
                              >
                                <RefreshCw size={14} className={rerollKey === key ? "animate-spin" : ""} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer bei Vorschau */}
        {result && (
          <div className="p-4 border-t border-gray-100 bg-white flex items-center gap-3">
            <button
              onClick={() => setResult(null)}
              className="px-4 py-3 text-gray-500 font-bold text-sm hover:text-gray-700 transition-colors"
            >
              Zurück
            </button>
            <button
              onClick={apply}
              disabled={isApplying}
              className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isApplying ? <><Loader2 size={18} className="animate-spin" /> Übernehme…</> : <><Check size={18} /> In den Planer übernehmen{newCount > 0 ? ` (${newCount} neue Rezepte)` : ""}</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
