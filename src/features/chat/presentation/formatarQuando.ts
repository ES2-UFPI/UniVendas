const HORA = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })
const DIA = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' })

/** Hoje mostra só a hora (ex.: 14:05); antes de hoje, o dia (ex.: 21/11). */
export function formatarQuando(data: Date, agora = new Date()): string {
  return data.toDateString() === agora.toDateString() ? HORA.format(data) : DIA.format(data)
}
