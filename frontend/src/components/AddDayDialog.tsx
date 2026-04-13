import { useState } from "react";

interface Props {
  defaultDate: string;
  onConfirm: (date: string) => void;
  onCancel: () => void;
}

export function AddDayDialog({ defaultDate, onConfirm, onCancel }: Props) {
  const [date, setDate] = useState(defaultDate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (date) onConfirm(date);
  };

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <p className="dialog-title">いつから始める？</p>
        <form onSubmit={handleSubmit}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          <div className="dialog-actions">
            <button type="button" className="btn-ghost" onClick={onCancel}>
              キャンセル
            </button>
            <button type="submit">追加</button>
          </div>
        </form>
      </div>
    </div>
  );
}
