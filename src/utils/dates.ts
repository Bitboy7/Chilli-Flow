const formatter = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDate(value: string | null): string {
  if (!value) {
    return "Aún no escaneada";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Fecha desconocida" : formatter.format(date);
}
