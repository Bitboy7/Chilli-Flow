import { useEffect, useState } from "react";

import { getAppStatus } from "../services/app-service";
import type { AppStatus } from "../types/app";

interface AppStatusState {
  status: AppStatus | null;
  error: string | null;
  isLoading: boolean;
}

export function useAppStatus(): AppStatusState {
  const [state, setState] = useState<AppStatusState>({
    status: null,
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    let isActive = true;

    getAppStatus()
      .then((status) => {
        if (isActive) {
          setState({ status, error: null, isLoading: false });
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setState({
            status: null,
            error:
              error instanceof Error
                ? error.message
                : "No fue posible inicializar Chilli Beat.",
            isLoading: false,
          });
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  return state;
}
