/** Desenhos de traço (24x24) usados nos botões, avisos e listas. */
export const ICONES = {
  mais: 'M12 5v14M5 12h14',
  voltar: 'M19 12H5m6-6-6 6 6 6',
  avancar: 'M5 12h14m-6-6 6 6-6 6',
  lixeira: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',
  lapis: 'M4 20h4L19 9l-4-4L4 16v4ZM13 7l4 4',
  check: 'm5 12 4 4L19 6',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 11v6M12 7h.01',
  alerta: 'm12 3 10 18H2ZM12 9v5M12 17h.01',
  chat: 'M4 5h16v11H9l-5 4V5Z',
  telefone:
    'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z',
  pino: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Zm-8-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  lupa: 'M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm10 18-4.3-4.3',
  enviar: 'm22 2-7 20-4-9-9-4 20-7ZM22 2 11 13',
  sacola: 'M5 8h14l-1 13H6L5 8Zm4 0V6a3 3 0 0 1 6 0v2',
  grade: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  localizacao: 'M12 2v3M12 19v3M2 12h3M19 12h3M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z',
  sair: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11',
} as const

export type NomeIcone = keyof typeof ICONES
