import { useState, useRef, useEffect } from "react";

interface Props {
  value: string;
  placeholder: string;
  onSave: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function EditableField({ value, placeholder, onSave, disabled, className }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    onSave(draft);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        className={className}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setEditing(false);
            setDraft(value);
          }
        }}
        onBlur={commit}
      />
    );
  }

  return (
    <span
      className={className}
      onClick={() => {
        if (disabled) return;
        setDraft(value);
        setEditing(true);
      }}
      style={{ cursor: disabled ? "default" : "pointer" }}
    >
      {value || <span style={{ opacity: 0.4 }}>{placeholder}</span>}
    </span>
  );
}
