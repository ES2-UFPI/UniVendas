const HORA = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })
const DIA = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' })

/** Hoje mostra só a hora (ex.: 14:05); antes de hoje, o dia (ex.: 21/11). */
export function formatarQuando(data: Date, agora = new Date()): string {
  return data.toDateString() === agora.toDateString() ? HORA.format(data) : DIA.format(data)
}

const DATA = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

/** O rótulo que separa as mensagens por dia na conversa: "Hoje", "Ontem" ou a data (21/11/2026). */
export function rotuloDoDia(data: Date, agora = new Date()): string {
  if (data.toDateString() === agora.toDateString()) return 'Hoje'
  const ontem = new Date(agora)
  ontem.setDate(agora.getDate() - 1)
  if (data.toDateString() === ontem.toDateString()) return 'Ontem'
  return DATA.format(data)
}
