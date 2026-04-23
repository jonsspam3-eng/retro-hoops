"use client";

export function ConfirmModal({
  open,
  title = "Confirm action",
  message = "This action cannot be undone.",
  confirmLabel = "confirm",
  cancelLabel = "cancel",
  onConfirm,
  onCancel,
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="admin-modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="admin-modal-actions">
          <button type="button" className="admin-cms-button" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="admin-delete" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
