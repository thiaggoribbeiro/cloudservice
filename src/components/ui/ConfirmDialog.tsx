import { Modal } from "./Modal";

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirmar",
  tone = "danger",
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  // Every current caller confirms a deletion, so destructive red is the default.
  tone?: "danger" | "primary";
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="font-body text-body-md text-light-on-surface">{message}</p>
      <div className="mt-gutter-lg flex flex-col-reverse gap-gutter-sm sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className="btn-ghost w-full sm:w-auto">
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={`${tone === "danger" ? "btn-danger" : "btn-primary"} w-full sm:w-auto`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
