export const logger = {
  info: (msg: string) => console.log(`\x1b[34m[INFO]\x1b[0m ${msg}`),
  success: (msg: string) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
  warn: (msg: string) => console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`),
  error: (msg: string, err?: any) => {
    console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`);
    if (err) console.error(err);
  },
  step: (msg: string) => console.log(`\n\x1b[1m\x1b[36m▶ ${msg}\x1b[0m`),
};
