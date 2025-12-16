import fs from 'fs';

const DEBUG_LOG = 'app-debug.log';

export const log = (...args: any[]) => {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  
  fs.appendFileSync(DEBUG_LOG, `[${new Date().toISOString()}] ${message}\n`);
};