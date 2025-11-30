import React from 'react';

const VARIANT_CONFIG = {
  default: {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    headerAccentClass: 'border-l-4 border-blue-500',
    iconWrapperClass: 'bg-blue-50 text-blue-600',
    confirmButtonClass:
      'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 focus:ring-offset-1',
    cancelButtonClass:
      'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 focus:ring-gray-300 focus:ring-offset-1',
    confirmLabel: 'Okay',
    cancelLabel: 'Cancel',
    requiresCancel: false
  },
  success: {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    headerAccentClass: 'border-l-4 border-green-500',
    iconWrapperClass: 'bg-green-50 text-green-600',
    confirmButtonClass:
      'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500 focus:ring-offset-1',
    cancelButtonClass:
      'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 focus:ring-gray-300 focus:ring-offset-1',
    confirmLabel: 'Great',
    cancelLabel: 'Close',
    requiresCancel: false
  },
  confirm: {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
    headerAccentClass: 'border-l-4 border-gray-400',
    iconWrapperClass: 'bg-gray-100 text-gray-600',
    confirmButtonClass:
      'bg-gray-700 hover:bg-gray-800 text-white focus:ring-gray-500 focus:ring-offset-1',
    cancelButtonClass:
      'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 focus:ring-gray-300 focus:ring-offset-1',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    requiresCancel: true
  },
  danger: {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
    headerAccentClass: 'border-l-4 border-red-500',
    iconWrapperClass: 'bg-red-50 text-red-600',
    confirmButtonClass:
      'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 focus:ring-offset-1',
    cancelButtonClass:
      'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 focus:ring-gray-300 focus:ring-offset-1',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    requiresCancel: true
  },
  brand: {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    headerAccentClass: 'border-l-4 border-dark-charcoal',
    iconWrapperClass: 'bg-medium-gray/10 text-dark-charcoal',
    confirmButtonClass:
      'bg-gradient-to-r from-medium-gray to-dark-charcoal text-white hover:from-light-gray hover:to-darkest-gray focus:ring-dark-charcoal focus:ring-offset-1',
    cancelButtonClass:
      'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 focus:ring-gray-300 focus:ring-offset-1',
    confirmLabel: 'Continue',
    cancelLabel: null,
    requiresCancel: false
  }
};

const Modal = ({
  isOpen,
  variant = 'default',
  title,
  message,
  children,
  confirmLabel,
  cancelLabel,
  onClose,
  onConfirm,
  closeOnOverlay = true,
  showCloseButton = true
}) => {
  if (!isOpen) {
    return null;
  }

  const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.default;
  const shouldHideCancel = cancelLabel === null || config.cancelLabel === null;
  const resolvedConfirmLabel =
    confirmLabel || config.confirmLabel || 'Confirm';
  const resolvedCancelLabel = shouldHideCancel
    ? null
    : cancelLabel || config.cancelLabel || 'Cancel';
  const shouldShowCancel =
    !shouldHideCancel &&
    (typeof onConfirm === 'function'
      ? config.requiresCancel || Boolean(onClose)
      : Boolean(onClose && (config.requiresCancel || resolvedCancelLabel)));

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget && closeOnOverlay && onClose) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      onClick={handleOverlayClick}
    >
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" />

      <div className="relative modal-responsive w-full overflow-hidden rounded-xl bg-white shadow-xl max-h-[90vh] flex flex-col">
        <div
          className={`px-4 py-3 sm:px-5 sm:py-4 border-b border-gray-100 bg-white ${config.headerAccentClass}`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full flex-shrink-0 ${config.iconWrapperClass}`}
            >
              {config.icon}
            </div>
            <div className="flex-1 min-w-0">
              {title && <h3 className="text-base sm:text-lg font-semibold text-gray-900 break-words">{title}</h3>}
              {message && <p className="mt-1 text-sm text-gray-600 break-words">{message}</p>}
            </div>
            {showCloseButton && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1 text-gray-400 transition hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 tap-target select-none-mobile flex-shrink-0"
              >
                <span className="sr-only">Close</span>
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {children && (
          <div className="px-4 py-3 sm:px-5 sm:py-4 text-sm text-gray-600 overflow-y-auto flex-1">
            {children}
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 border-t bg-gray-50 px-4 py-3 sm:px-5">
          {shouldShowCancel && onClose && (
            <button
              type="button"
              onClick={onClose}
              className={`btn-responsive rounded-md focus:outline-none focus:ring-2 ${config.cancelButtonClass}`}
            >
              {resolvedCancelLabel}
            </button>
          )}

          {typeof onConfirm === 'function' && (
            <button
              type="button"
              onClick={onConfirm}
              className={`btn-responsive rounded-md focus:outline-none focus:ring-2 ${config.confirmButtonClass}`}
            >
              {resolvedConfirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;

