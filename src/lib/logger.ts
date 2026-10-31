/** Logger estruturado (JSON em stdout). Nunca registre conteúdo clínico aqui. */
type Level = 'debug' | 'info' | 'warn' | 'error';

function write(level: Level, msg: string, meta?: Record<string, unknown>) {
  const entry = { ts: new Date().toISOString(), level, msg, ...meta };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else if (process.env.NODE_ENV !== 'test') console.log(line);
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => process.env.MIRA_DEBUG && write('debug', msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => write('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => write('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => write('error', msg, meta),
};
