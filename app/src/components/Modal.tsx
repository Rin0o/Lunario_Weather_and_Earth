import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/**
 * A window over the page, on the native <dialog>: it keeps the focus inside, closes with Esc
 * or a tap on the dimmed backdrop, and gives the focus back to the button that opened it.
 */
export function Modal({ open, onClose, title, children }: ModalProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={titleId}
      onClose={onClose}
      // A tap on the backdrop lands on the <dialog> itself, never on its contents.
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-body">
        <header className="modal-header">
          <h3 id={titleId}>{title}</h3>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label={t('modal.close')}
          >
            <X aria-hidden="true" size={20} />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
