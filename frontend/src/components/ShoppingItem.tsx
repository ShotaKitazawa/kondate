import { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ShoppingItem } from "../api";
import { EditableField } from "./EditableField";

interface Props {
  item: ShoppingItem;
  onToggle: (id: string, checked: boolean) => void;
  onUpdateName: (id: string, name: string) => void;
  onUpdateNote: (id: string, note: string | null) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
}

export function ShoppingItemRow({ item, onToggle, onUpdateName, onUpdateNote, onDelete, disabled }: Props) {
  const [showNote, setShowNote] = useState(!!item.note);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(item.name);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const hasNote = !!item.note;

  useEffect(() => {
    if (editingName) nameInputRef.current?.focus();
  }, [editingName]);

  const commitName = () => {
    setEditingName(false);
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== item.name) onUpdateName(item.id, trimmed);
    else setNameDraft(item.name);
  };

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
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={item.checked}
            disabled={disabled}
            onChange={(e) => onToggle(item.id, e.target.checked)}
          />
        </label>
        {editingName ? (
          <input
            ref={nameInputRef}
            className="shopping-item-name-input"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitName();
              if (e.key === "Escape") { setEditingName(false); setNameDraft(item.name); }
            }}
            onBlur={commitName}
          />
        ) : (
          <span
            className={`shopping-item-name${item.checked ? " checked" : ""}`}
            onClick={() => { if (!disabled) { setNameDraft(item.name); setEditingName(true); } }}
            style={{ cursor: disabled ? "default" : "pointer" }}
          >
            {item.name}
          </span>
        )}
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
