import React, { useState, useEffect } from 'react';

export const ElapsedTime: React.FC<{ startTime: number }> = ({ startTime }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    setElapsed(Math.floor((Date.now() - startTime) / 1000));
    return () => clearInterval(interval);
  }, [startTime]);

  return <>{elapsed}</>;
};
