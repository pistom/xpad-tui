import { useEffect, useState } from 'react';

export function useTerminalSize(): [number, number] {
  const [size, setSize] = useState({ 
    cols: process.stdout.columns || 80, 
    rows: process.stdout.rows || 24 
  });

  useEffect(() => {
    const handleResize = () => setSize({ 
      cols: process.stdout.columns || 80, 
      rows: process.stdout.rows || 24 
    });
    
    process.stdout.on('resize', handleResize);
    return () => { 
      process.stdout.off('resize', handleResize); 
    };
  }, []);

  return [size.cols, size.rows];
}
