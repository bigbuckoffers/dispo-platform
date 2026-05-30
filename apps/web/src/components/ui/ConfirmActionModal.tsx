'use client';

import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

type Variant = 'normal' | 'warning' | 'danger' | 'success';

type ConfirmActionModalProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: Variant;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  children?: React.ReactNode;
};

function variantStyles(variant: Variant) {
  if (variant === 'danger') {
    return {
      iconWrap: 'bg-red-500/10 border-red-700/40',
      icon: 'text-red-300',
      button: 'bg-red-600 hover:bg-red-500 text-white',
      ring: 'border-red-700/40',
      glow: 'from-red-950/80 to-gray-950',
      Icon: AlertTriangle,
    };
  }

  if (variant === 'warning') {
    return {
      iconWrap: 'bg-yellow-500/10 border-yellow-700/40',
      icon: 'text-yellow-300',
      button: 'bg-yellow-500 hover:bg-yellow-400 text-black',
      ring: 'border-yellow-700/40',
      glow: 'from-yellow-950/70 to-gray-950',
      Icon: AlertTriangle,
    };
  }

  if (variant === 'success') {
    return {
      iconWrap: 'bg-green-500/10 border-green-700/40',
      icon: 'text-green-300',
      button: 'bg-green-600 hover:bg-green-500 text-white',
      ring: 'border-green-700/40',
      glow: 'from-green-950/70 to-gray-950',
      Icon: CheckCircle2,
    };
  }

  return {
    iconWrap: 'bg-purple-500/10 border-purple-700/40',
    icon: 'text-purple-300',
    button: 'bg-purple-600 hover:bg-purple-500 text-white',
    ring: 'border-purple-700/40',
    glow: 'from-purple-950/80 to-blue-950/40',
    Icon: Info,
  };
}

export function ConfirmActionModal({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'normal',
  loading = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmActionModalProps) {
  if (!open) return null;

  const styles = variantStyles(variant);
  const Icon = styles.Icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm px-4">
      <div className={`w-full max-w-lg overflow-hidden rounded-2xl border ${styles.ring} bg-gray-950 shadow-2xl`}>
        <div className={`border-b border-gray-800 bg-gradient-to-r ${styles.glow} px-6 py-5`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`rounded-xl border ${styles.iconWrap} p-2`}>
                <Icon size={20} className={styles.icon} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                {description && (
                  <p className="mt-1 text-sm leading-relaxed text-gray-400">{description}</p>
                )}
              </div>
            </div>

            <button
              onClick={onCancel}
              disabled={loading}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-800 hover:text-white disabled:opacity-50"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {children && (
          <div className="border-b border-gray-800 px-6 py-4">
            {children}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 px-6 py-4">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 disabled:opacity-50"
          >
            {cancelLabel}
          </button>

          <button
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 ${styles.button}`}
          >
            {loading ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
