import React, { useState } from "react";
import { DailyTask } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, Circle, Plus, Trash2, ListTodo, Sparkles, Zap } from "lucide-react";

interface TasksPageProps {
  tasks: DailyTask[];
  onAddTask: (text: string) => void;
  onToggleTask: (id: string, isCompleted: boolean) => void;
  onDeleteTask: (id: string) => void;
}

export const TasksPage: React.FC<TasksPageProps> = ({ tasks, onAddTask, onToggleTask, onDeleteTask }) => {
  const [newTaskText, setNewTaskText] = useState("");

  const completedTasks = tasks.filter(t => t.isCompleted);
  const pendingTasks = tasks.filter(t => !t.isCompleted);
  const smartTasks = tasks.filter(t => t.isSmartTask && !t.isCompleted);
  const manualTasks = tasks.filter(t => !t.isSmartTask && !t.isCompleted);

  return (
    <div className="flex flex-col gap-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl md:text-4xl font-serif font-black text-gray-900 tracking-tight flex items-center gap-3">
          <ListTodo className="text-indigo-500" size={36} />
          Heutige Aufgaben
        </h2>
        <p className="text-gray-500 font-medium">
          {completedTasks.length} von {tasks.length} Aufgaben erledigt
        </p>
      </div>

      {/* Progress Bar */}
      {tasks.length > 0 && (
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-indigo-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${Math.round((completedTasks.length / tasks.length) * 100)}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      )}

      {/* Add Task */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (newTaskText.trim()) {
            onAddTask(newTaskText.trim());
            setNewTaskText("");
          }
        }}
        className="flex gap-3"
      >
        <input
          type="text"
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          placeholder="Neue Aufgabe hinzufügen..."
          className="flex-1 px-5 py-4 bg-white border-2 border-gray-100 rounded-2xl text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 transition-all shadow-sm text-sm font-medium"
        />
        <button
          type="submit"
          disabled={!newTaskText.trim()}
          className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-200 disabled:opacity-40 disabled:shadow-none flex items-center gap-2"
        >
          <Plus size={20} />
          <span className="hidden sm:inline">Hinzufügen</span>
        </button>
      </form>

      {/* Pending Tasks */}
      {pendingTasks.length > 0 && (
        <div className="flex flex-col gap-3">
          {smartTasks.length > 0 && (
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-400">
              <Zap size={14} /> Automatische Aufgaben
            </div>
          )}
          {smartTasks.length > 0 && smartTasks.map((task, i) => (
            <TaskItem key={task.id} task={task} onToggle={onToggleTask} onDelete={onDeleteTask} delay={i * 0.05} />
          ))}

          {manualTasks.length > 0 && smartTasks.length > 0 && (
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 mt-2">
              <ListTodo size={14} /> Eigene Aufgaben
            </div>
          )}
          {manualTasks.map((task, i) => (
            <TaskItem key={task.id} task={task} onToggle={onToggleTask} onDelete={onDeleteTask} delay={i * 0.05} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {pendingTasks.length === 0 && tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-300">
            <Sparkles size={40} />
          </div>
          <div>
            <h3 className="font-serif font-bold text-xl text-gray-800">Alles erledigt!</h3>
            <p className="text-gray-400 text-sm mt-1">Keine offenen Aufgaben. Genieß den Tag!</p>
          </div>
        </div>
      )}

      {/* All Done State */}
      {pendingTasks.length === 0 && tasks.length > 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center text-green-400">
            <CheckCircle2 size={36} />
          </div>
          <h3 className="font-serif font-bold text-lg text-gray-700">Alle Aufgaben erledigt! 🎉</h3>
        </div>
      )}

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400">
            <CheckCircle2 size={14} /> Erledigt ({completedTasks.length})
          </div>
          {completedTasks.map((task, i) => (
            <TaskItem key={task.id} task={task} onToggle={onToggleTask} onDelete={onDeleteTask} delay={i * 0.05} />
          ))}
        </div>
      )}
    </div>
  );
};

const TaskItem: React.FC<{
  task: DailyTask;
  onToggle: (id: string, val: boolean) => void;
  onDelete: (id: string) => void;
  delay?: number;
}> = ({ task, onToggle, onDelete, delay = 0 }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className={`group flex items-center gap-4 p-4 rounded-2xl border transition-all ${
      task.isCompleted
        ? "bg-gray-50 border-gray-100 opacity-60"
        : "bg-white border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100"
    }`}
  >
    <button
      onClick={() => onToggle(task.id, !task.isCompleted)}
      className={`shrink-0 transition-colors ${task.isCompleted ? "text-indigo-400" : "text-gray-300 hover:text-indigo-500"}`}
    >
      {task.isCompleted ? <CheckCircle2 size={24} /> : <Circle size={24} />}
    </button>

    <span className={`flex-1 text-sm font-semibold ${task.isCompleted ? "line-through text-gray-400" : "text-gray-700"}`}>
      {task.text}
    </span>

    {task.isSmartTask && (
      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-50 px-2 py-1 rounded-lg">
        Auto
      </span>
    )}

    {!task.isSmartTask && (
      <button
        onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-300 hover:text-red-400 transition-all rounded-lg"
      >
        <Trash2 size={16} />
      </button>
    )}
  </motion.div>
);
