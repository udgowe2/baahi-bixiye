import React from "react";
import { Ingredient, Recipe, PlannerSlot, ShoppingItem } from "../types";
import { ShoppingCart, CheckCircle2, Circle, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ShoppingListProps {
  planner: PlannerSlot[];
  recipes: Recipe[];
  manualItems: ShoppingItem[];
  onAddManualItem: (name: string, amount: string) => void;
  onToggleManualItem: (id: string, isCompleted: boolean) => void;
  onDeleteManualItem: (id: string) => void;
}

export const ShoppingList: React.FC<ShoppingListProps> = ({
  planner,
  recipes,
  manualItems,
  onAddManualItem,
  onToggleManualItem,
  onDeleteManualItem
}) => {
  const [checkedPlannedItems, setCheckedPlannedItems] = React.useState<Set<string>>(new Set());
  const [showPantry, setShowPantry] = React.useState(false);
  const [newItemName, setNewItemName] = React.useState("");
  const [newItemAmount, setNewItemAmount] = React.useState("");

  // Consolidate ingredients from planned recipes
  const allIngredients = React.useMemo(() => {
    const list: Ingredient[] = [];
    planner.forEach(slot => {
      if (slot.recipeIds && slot.recipeIds.length > 0) {
        slot.recipeIds.forEach(id => {
          const recipe = recipes.find(r => r.id === id);
          if (recipe) {
            list.push(...recipe.ingredients);
          }
        });
      }
    });

    // Deduplicate and merge amounts
    const merged = list.reduce((acc, curr) => {
      const key = curr.name.toLowerCase().trim();
      if (!acc[key]) {
        acc[key] = { ...curr };
      } else {
        // Simple string concatenation for amounts
        acc[key].amount = `${acc[key].amount}, ${curr.amount}`;
      }
      return acc;
    }, {} as Record<string, Ingredient>);

    return Object.values(merged);
  }, [planner, recipes]);

  const plannedShoppingItems = allIngredients.filter(i => !i.isPantry);
  const pantryItems = allIngredients.filter(i => i.isPantry);

  const togglePlannedItem = (name: string) => {
    const next = new Set(checkedPlannedItems);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setCheckedPlannedItems(next);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemName.trim()) {
      onAddManualItem(newItemName.trim(), newItemAmount.trim());
      setNewItemName("");
      setNewItemAmount("");
    }
  };

  const hasAnyItems = plannedShoppingItems.length > 0 || manualItems.length > 0;

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden max-w-2xl mx-auto w-full">
      <div className="bg-indigo-600 p-6 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingCart size={24} />
          <h2 className="text-xl font-bold font-serif tracking-tight">Einkaufsliste</h2>
        </div>
        <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full uppercase tracking-widest">
          {plannedShoppingItems.length + manualItems.length} Artikel
        </span>
      </div>

      <div className="p-4 md:p-6 flex flex-col gap-6">
        {/* Manual Add Form */}
        <form onSubmit={handleAdd} className="flex gap-2 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
          <input
            type="text"
            placeholder="Artikel hinzufügen (z.B. Milch)"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="flex-1 bg-white border border-indigo-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
          <input
            type="text"
            placeholder="Menge"
            value={newItemAmount}
            onChange={(e) => setNewItemAmount(e.target.value)}
            className="w-20 bg-white border border-indigo-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
          <button
            type="submit"
            disabled={!newItemName.trim()}
            className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Plus size={20} />
          </button>
        </form>

        {!hasAnyItems ? (
          <div className="text-center py-10 text-gray-400 italic">
            Deine Liste ist leer. Füge Artikel manuell hinzu oder plane Mahlzeiten!
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {/* Manual Items */}
            {manualItems.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all group ${item.isCompleted ? "bg-gray-50 opacity-50" : "hover:bg-indigo-50/50"
                  }`}
              >
                <button
                  onClick={() => onToggleManualItem(item.id, !item.isCompleted)}
                  className="flex items-center gap-3 flex-1 text-left"
                >
                  {item.isCompleted ? (
                    <CheckCircle2 className="text-indigo-500" size={20} />
                  ) : (
                    <Circle className="text-gray-300" size={20} />
                  )}
                  <div className="flex flex-col">
                    <span className={`font-medium ${item.isCompleted ? "line-through text-gray-400" : "text-gray-700"}`}>
                      {item.name}
                    </span>
                    {item.amount && <span className="text-xs text-gray-400">{item.amount}</span>}
                  </div>
                </button>
                <button
                  onClick={() => onDeleteManualItem(item.id)}
                  className="p-2 text-red-400 md:text-gray-300 hover:text-red-500 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            {/* Planned Items */}
            {plannedShoppingItems.map((item) => (
              <button
                key={item.name}
                onClick={() => togglePlannedItem(item.name)}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all text-left ${checkedPlannedItems.has(item.name) ? "bg-gray-50 opacity-50" : "hover:bg-indigo-50/50"
                  }`}
              >
                {checkedPlannedItems.has(item.name) ? (
                  <CheckCircle2 className="text-indigo-500" size={20} />
                ) : (
                  <Circle className="text-gray-300" size={20} />
                )}
                <div className="flex flex-col">
                  <span className={`font-medium ${checkedPlannedItems.has(item.name) ? "line-through text-gray-400" : "text-gray-700"}`}>
                    {item.name}
                  </span>
                  <span className="text-xs text-gray-400">{item.amount}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {pantryItems.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <button
              onClick={() => setShowPantry(!showPantry)}
              className="flex items-center justify-between w-full text-gray-400 hover:text-gray-600 transition-colors text-sm font-semibold uppercase tracking-wider"
            >
              <span>Vorrat prüfen ({pantryItems.length})</span>
              {showPantry ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            <AnimatePresence>
              {showPantry && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-1 mt-3">
                    {pantryItems.map((item) => (
                      <div key={item.name} className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 italic">
                        <div className="w-1 h-1 rounded-full bg-gray-200" />
                        <span>{item.name}</span>
                        <span className="opacity-60">({item.amount})</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
