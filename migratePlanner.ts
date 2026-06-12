import { initDb, pool } from './api/db.ts';

function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}
function addDays(date: Date, days: number): Date {
  const res = new Date(date);
  res.setDate(res.getDate() + days);
  return res;
}

async function migrate() {
    await initDb();
    console.log("Migrating NULL dates to current week...");
    const currentMonday = getMonday(new Date());

    for (let i = 0; i < 7; i++) {
       const dateStr = formatDateStr(addDays(currentMonday, i));
       
       // Because id is the primary key, we might need to delete old rows and insert new ones
       // Or update the primary key directly.
       const [rows]: any = await pool.query('SELECT * FROM planner WHERE dateStr IS NULL AND dayIndex = ?', [i]);
       
       for (const row of rows) {
           const newId = `${dateStr}-${row.mealType}`;
           try {
             // Try to update it to new specific ID mapping to the current week
             await pool.query('UPDATE planner SET dateStr = ?, id = ? WHERE id = ?', [dateStr, newId, row.id]);
             console.log(`Migrated ${row.id} to ${newId}`);
           } catch (e: any) {
               console.error("Conflict updating row", row.id, e.message);
               // If there's already an entry for this specific date, simply delete the old template so it doesn't mask it
               await pool.query('DELETE FROM planner WHERE id = ?', [row.id]);
               console.log(`Deleted conflicting legacy template ${row.id}`);
           }
       }
    }
    console.log("Migration complete!");
    process.exit(0);
}

migrate();
