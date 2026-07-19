import {
  CircleAlert,
  CircleCheck,
  Info,
  X,
} from "lucide-react";
import { useEffect } from "react";

import {
  useToastStore,
  type ToastMessage,
} from "../../stores/toast-store";

const icons = {
  success: CircleCheck,
  error: CircleAlert,
  info: Info,
};

function Toast({ message }: { message: ToastMessage }) {
  const remove = useToastStore((state) => state.remove);
  const Icon = icons[message.kind];

  useEffect(() => {
    const timeout = window.setTimeout(() => remove(message.id), 5000);
    return () => window.clearTimeout(timeout);
  }, [message.id, remove]);

  return (
    <article className="flex w-[22rem] max-w-[calc(100vw-2rem)] gap-3 rounded-2xl border border-white/10 bg-[#24211e]/95 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl">
      <Icon
        className={[
          "mt-0.5 size-4 shrink-0",
          message.kind === "success"
            ? "text-lime-400"
            : message.kind === "error"
              ? "text-red-400"
              : "text-orange-300",
        ].join(" ")}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-stone-100">{message.title}</p>
        {message.description ? (
          <p className="mt-1 text-xs leading-5 text-stone-500">
            {message.description}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => remove(message.id)}
        className="grid size-6 place-items-center rounded-md text-stone-600 hover:bg-white/5 hover:text-stone-300"
        aria-label="Cerrar notificación"
      >
        <X className="size-3.5" />
      </button>
    </article>
  );
}

export function Toaster() {
  const messages = useToastStore((state) => state.messages);

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex flex-col gap-2">
      {messages.map((message) => (
        <div key={message.id} className="pointer-events-auto">
          <Toast message={message} />
        </div>
      ))}
    </div>
  );
}
