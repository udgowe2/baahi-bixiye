import React, { useState, useEffect } from "react";
import { Recipe, Ingredient, RecipeMealTime, RecipeCategory } from "../types";
import { X, Plus, Trash2, Save, Image as ImageIcon, Upload, Camera, Link as LinkIcon } from "lucide-react";
import { getImageUrl } from "../utils/imageUrl";

interface RecipeFormProps {
  recipe?: Recipe;
  onSave: (recipe: Recipe) => void;
  onClose: () => void;
}

export const RecipeForm: React.FC<RecipeFormProps> = ({ recipe, onSave, onClose }) => {
  const [title, setTitle] = useState(recipe?.title || "");
  const [image, setImage] = useState(recipe?.image || "");
  const [prepTime, setPrepTime] = useState(recipe?.prepTime || "");
  const [mealTime, setMealTime] = useState<RecipeMealTime | "">(recipe?.mealTime || "");
  const [category, setCategory] = useState<RecipeCategory | "">(recipe?.category || "");
  const [instructions, setInstructions] = useState(recipe?.instructions || "");
  const [tags, setTags] = useState<string[]>(recipe?.tags || []);
  const [ingredients, setIngredients] = useState<Ingredient[]>(recipe?.ingredients || []);

  const [newTag, setNewTag] = useState("");
  const [newIngName, setNewIngName] = useState("");
  const [newIngAmount, setNewIngAmount] = useState("");
  const [newIngIsPantry, setNewIngIsPantry] = useState(false);
  
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("image", file);

    const API_BASE = `${window.location.protocol}//${window.location.hostname}:3001`;

    try {
      const res = await fetch(`${API_BASE}/api/upload-image`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setImage(data.url);
      }
    } catch (err) {
      console.error("Upload failed", err);
      alert("Fehler beim Hochladen des Bildes.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && newTag.trim()) {
      e.preventDefault();
      if (!tags.includes(newTag.trim())) {
        setTags([...tags, newTag.trim()]);
      }
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleAddIngredient = () => {
    if (newIngName.trim()) {
      setIngredients([
        ...ingredients,
        { name: newIngName.trim(), amount: newIngAmount.trim(), isPantry: newIngIsPantry }
      ]);
      setNewIngName("");
      setNewIngAmount("");
      setNewIngIsPantry(false);
    }
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleEditIngredient = (index: number, field: keyof Ingredient, value: string | boolean) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalRecipe: Recipe = {
      id: recipe?.id || Math.random().toString(36).substring(2, 11),
      title,
      image,
      prepTime,
      mealTime: mealTime === "" ? undefined : mealTime as RecipeMealTime,
      category: category === "" ? undefined : category as RecipeCategory,
      instructions,
      tags,
      ingredients,
      sourceUrl: recipe?.sourceUrl,
      createdAt: recipe?.createdAt || new Date().toISOString()
    };
    onSave(finalRecipe);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-50/50">
          <h2 className="text-2xl font-serif font-bold text-gray-800">
            {recipe ? "Rezept bearbeiten" : "Neues Rezept erstellen"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors">
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        <form id="recipe-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column: Basic Info */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Rezept-Titel</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-lg font-bold"
                placeholder="z.B. Omas berühmte Lasagne"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Zubereitungszeit</label>
                <input
                  type="text"
                  value={prepTime}
                  onChange={(e) => setPrepTime(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="z.B. 45 Min"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Rezept-Bild</label>
                
                <div className="flex flex-col gap-2">
                    {/* Preview / URL Input */}
                    <div className="relative flex items-center">
                        <div className="absolute left-3 w-8 h-8 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">
                            {image ? (
                                <img src={getImageUrl(image)} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <ImageIcon className="text-gray-400" size={16} />
                            )}
                        </div>
                        <input
                            type="text"
                            value={image}
                            onChange={(e) => setImage(e.target.value)}
                            className="w-full pl-14 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-sm"
                            placeholder="Bild-URL oder Datei hochladen..."
                        />
                         {isUploading && (
                             <div className="absolute right-3">
                                 <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-500 border-t-transparent"></div>
                             </div>
                         )}
                    </div>

                    {/* Upload Buttons */}
                    <div className="flex gap-2">
                        <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            ref={fileInputRef} 
                            onChange={handleFileUpload} 
                        />
                        <input 
                            type="file" 
                            accept="image/*" 
                            capture="environment" 
                            className="hidden" 
                            ref={cameraInputRef} 
                            onChange={handleFileUpload} 
                        />
                        
                        <button 
                            type="button" 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-colors disabled:opacity-50"
                        >
                            <Upload size={16} /> Datei
                        </button>
                        <button 
                            type="button" 
                            onClick={() => cameraInputRef.current?.click()}
                            disabled={isUploading}
                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-colors disabled:opacity-50 md:hidden" 
                        >
                            {/* Camera button only useful/shown on mobile devices visually, but functional everywhere */}
                            <Camera size={16} /> Foto
                        </button>
                    </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Mahlzeit</label>
                <select
                  value={mealTime}
                  onChange={(e) => setMealTime(e.target.value as any)}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-sm"
                >
                  <option value="">-- Keine --</option>
                  <option value="breakfast">Frühstück</option>
                  <option value="lunch">Mittagessen</option>
                  <option value="dinner">Abendessen</option>
                  <option value="snack">Snack</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Kategorie</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-sm"
                >
                  <option value="">-- Keine --</option>
                  <option value="komplett">Komplett-Mahlzeit</option>
                  <option value="gemuese">Gemüse-Fokus</option>
                  <option value="fleisch">Fleisch / Fisch</option>
                  <option value="staerke">Sättigungsbeilage</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Tags (Enter drücken)</label>
              <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-xl min-h-[56px]">
                {tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold">
                    {tag}
                    <button type="button" onClick={() => handleRemoveTag(tag)}><X size={12} /></button>
                  </span>
                ))}
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={handleAddTag}
                  className="bg-transparent border-none focus:ring-0 p-0 text-xs flex-1 min-w-[100px]"
                  placeholder="Tag hinzufügen..."
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Anleitung (Markdown)</label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 min-h-[200px] text-sm leading-relaxed"
                placeholder="Schritt 1: Wasser kochen..."
              />
            </div>
          </div>

          {/* Right Column: Ingredients */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Zutaten</label>

              <div className="flex flex-col gap-2 p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Name (z.B. Karotten)"
                    value={newIngName}
                    onChange={(e) => setNewIngName(e.target.value)}
                    className="px-3 py-2 bg-white border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <input
                    type="text"
                    placeholder="Menge (z.B. 500g)"
                    value={newIngAmount}
                    onChange={(e) => setNewIngAmount(e.target.value)}
                    className="px-3 py-2 bg-white border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mt-3 sm:mt-0">
                  <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newIngIsPantry}
                      onChange={(e) => setNewIngIsPantry(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    Vorratsschrank-Grundlage?
                  </label>
                  <button
                    type="button"
                    onClick={handleAddIngredient}
                    className="flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors"
                  >
                    <Plus size={14} /> Hinzufügen
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {ingredients.map((ing, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl shadow-sm group">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                        <input
                            type="text"
                            value={ing.name}
                            onChange={(e) => handleEditIngredient(idx, "name", e.target.value)}
                            className="px-2 py-1.5 bg-gray-50/50 border border-transparent hover:border-gray-200 focus:border-indigo-300 focus:bg-white rounded-lg text-sm font-bold text-gray-700 transition-all w-full"
                            placeholder="Zutat"
                        />
                        <input
                            type="text"
                            value={ing.amount}
                            onChange={(e) => handleEditIngredient(idx, "amount", e.target.value)}
                            className="px-2 py-1.5 bg-gray-50/50 border border-transparent hover:border-gray-200 focus:border-indigo-300 focus:bg-white rounded-lg text-xs text-gray-500 transition-all w-full"
                            placeholder="Menge"
                        />
                    </div>
                    
                    <div className="flex items-center justify-between w-full sm:w-auto gap-3">
                        <label className="flex items-center gap-1.5 text-[10px] text-gray-400 cursor-pointer hover:text-indigo-600 transition-colors bg-gray-50 px-2 py-1.5 rounded-lg border border-transparent hover:border-indigo-100">
                            <input
                            type="checkbox"
                            checked={ing.isPantry}
                            onChange={(e) => handleEditIngredient(idx, "isPantry", e.target.checked)}
                            className="rounded text-indigo-500 focus:ring-indigo-500 w-3 h-3"
                            />
                            Vorrat
                        </label>
                        <button
                        type="button"
                        onClick={() => handleRemoveIngredient(idx)}
                        className="p-1.5 text-red-500 md:text-gray-300 md:hover:text-red-500 transition-all rounded-lg hover:bg-red-50"
                        title="Zutat löschen"
                        >
                        <Trash2 size={16} />
                        </button>
                    </div>
                  </div>
                ))}
                {ingredients.length === 0 && (
                  <div className="text-center py-8 text-gray-300 italic text-xs">Noch keine Zutaten hinzugefügt</div>
                )}
              </div>
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-4 bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-gray-500 font-bold hover:text-gray-700 transition-colors"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            form="recipe-form"
            className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-full font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            <Save size={20} />
            Rezept speichern
          </button>
        </div>
      </div>
    </div>
  );
};
