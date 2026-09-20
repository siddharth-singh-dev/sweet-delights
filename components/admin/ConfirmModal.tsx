"use client";

export default function ConfirmModal({
  title,
  body,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
}: {
  title: string;
  body: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm?: () => void;
  onClose: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <h3>{title}</h3>
        <p className="body-text">{body}</p>
        <div className="modal-actions">
          {onConfirm ? (
            <>
              <button className="btn btn-outline small" onClick={onClose}>
                Cancel
              </button>
              <button
                className={danger ? "btn btn-danger small" : "btn btn-primary small"}
                onClick={onConfirm}
              >
                {confirmLabel ?? "Confirm"}
              </button>
            </>
          ) : (
            <button className="btn btn-primary small" onClick={onClose}>
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
