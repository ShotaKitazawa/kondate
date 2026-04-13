import type { DayEntry } from "../api";
import { EditableField } from "./EditableField";

interface Props {
  day: DayEntry;
  onUpdate: (
    id: string,
    fields: {
      note?: string | null;
      lunch?: string | null;
      dinner?: string | null;
    },
  ) => void;
  onDelete: (id: string) => void;
  canDelete?: boolean;
  disabled?: boolean;
}

export function DayRow({ day, onUpdate, onDelete, canDelete = false, disabled }: Props) {
  const date = new Date(day.date + "T00:00:00");
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const label = `${date.getMonth() + 1}/${date.getDate()}(${weekdays[date.getDay()]})`;

  return (
    <div className="day-row">
      <div className="day-row-header">
        <span className="day-label">{label}</span>
        {canDelete && (
          <button
            aria-label="削除"
            disabled={disabled}
            onClick={() => onDelete(day.id)}
            style={{ background: "none", border: "none" }}
          >
            ✕
          </button>
        )}
      </div>

      <div className="day-row-meals">
        <div className="meal-line">
          <span className="meal-label">昼</span>
          <EditableField
            value={day.lunch ?? ""}
            placeholder="入力..."
            onSave={(v) => onUpdate(day.id, { lunch: v || null })}
            disabled={disabled}
          />
        </div>
        <div className="meal-line">
          <span className="meal-label">夜</span>
          <EditableField
            value={day.dinner ?? ""}
            placeholder="入力..."
            onSave={(v) => onUpdate(day.id, { dinner: v || null })}
            disabled={disabled}
          />
        </div>
        <div className="meal-note">
          <EditableField
            value={day.note ?? ""}
            placeholder="メモ（外食・各自など）"
            onSave={(v) => onUpdate(day.id, { note: v || null })}
            disabled={disabled}
            className="note-field"
          />
        </div>
      </div>
    </div>
  );
}
