"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

const ToastContext = createContext({
  pushToast: () => {},
});

let toastId = 0;

export function AdminToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    ({ title, message, tone = "success" }) => {
      const id = toastId++;
      const nextToast = {
        id,
        title: title || "Update",
        message: message || "",
        tone,
      };

      setToasts((prev) => [...prev, nextToast].slice(-4));
      window.setTimeout(() => removeToast(id), 2800);
    },
    [removeToast],
  );

  const value = useMemo(
    () => ({
      pushToast,
    }),
    [pushToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="admin-toast-viewport" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <article key={toast.id} className={`admin-toast is-${toast.tone}`}>
            <h3>{toast.title}</h3>
            {toast.message ? <p>{toast.message}</p> : null}
          </article>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useAdminToast() {
  return useContext(ToastContext);
}
