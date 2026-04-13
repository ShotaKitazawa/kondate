import type { DayEntry } from "../api";
import { DayRow } from "./DayRow";

interface Props {
  days: DayEntry[];
  onAddDay: () => void;
  onUpdateDay: (
    id: string,
    fields: {
      note?: string | null;
      lunch?: string | null;
      dinner?: string | null;
    },
  ) => void;
  onDeleteDay: (id: string) => void;
  /** 後に追加・削除ボタンを表示するか（最終ページかつ非アーカイブのときのみ true） */
  canAdd?: boolean;
  disabled?: boolean;
}

export function MealSection({
  days,
  onAddDay,
  onUpdateDay,
  onDeleteDay,
  canAdd = false,
  disabled,
}: Props) {
  if (days.length === 0) {
    return (
      <section className="section-empty">
        <p className="empty-hint">献立がまだありません</p>
        {canAdd && (
          <button disabled={disabled} onClick={onAddDay}>
            + 日を追加
          </button>
        )}
      </section>
    );
  }

  return (
    <section>
      <h2>献立</h2>
      <div className="day-list">
        {days.map((day, index) => (
          <DayRow
            key={day.id}
            day={day}
            onUpdate={onUpdateDay}
            onDelete={onDeleteDay}
            canDelete={canAdd && index === days.length - 1}
            disabled={disabled}
          />
        ))}
      </div>
      {canAdd && (
        <button className="add-day-btn" disabled={disabled} onClick={onAddDay}>
          + 後に追加
        </button>
      )}
    </section>
  );
}
