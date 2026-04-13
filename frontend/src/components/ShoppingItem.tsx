import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ShoppingItem } from "../api";
import { EditableField } from "./EditableField";

interface Props {
  item: ShoppingItem;
  onToggle: (id: string, checked: boolean) => void;
  onUpdateNote: (id: string, note: string | null) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
}

export function ShoppingItemRow({ item, onToggle, onUpdateNote, onDelete, disabled }: Props) {
  const [showNote, setShowNote] = useState(!!item.note);
  const hasNote = !!item.note;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="shopping-item">
      <div className="shopping-item-row">
        <span className="drag-handle" {...attributes} {...listeners}>
          ⠿
        </span>
        <input
          type="checkbox"
          checked={item.checked}
          disabled={disabled}
          onChange={(e) => onToggle(item.id, e.target.checked)}
        />
        <span className={`shopping-item-name${item.checked ? " checked" : ""}`}>{item.name}</span>
        <button
          className={`memo-toggle${hasNote ? " has-note" : ""}`}
          onClick={() => setShowNote((s) => !s)}
          disabled={disabled}
          aria-label="メモ"
          style={{ background: "none", border: "none" }}
        >
          📝
        </button>
        {!disabled && (
          <button
            aria-label="削除"
            onClick={() => onDelete(item.id)}
            style={{ background: "none", border: "none" }}
          >
            ✕
          </button>
        )}
      </div>
      {showNote && (
        <div className="shopping-item-note">
          <EditableField
            value={item.note ?? ""}
            placeholder="メモを入力..."
            onSave={(v) => onUpdateNote(item.id, v || null)}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}
