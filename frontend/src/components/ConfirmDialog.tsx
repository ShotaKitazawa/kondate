interface Props {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ message, onConfirm, onCancel }: Props) {
  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <p className="dialog-title">{message}</p>
        <div className="dialog-actions">
          <button type="button" className="btn-ghost" onClick={onCancel}>
            キャンセル
          </button>
          <button type="button" className="btn-danger" onClick={onConfirm}>
            削除
          </button>
        </div>
      </div>
    </div>
  );
}
