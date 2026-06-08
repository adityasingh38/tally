import React, { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';

/**
 * Counts up to `value` with an ease-out curve. `format` turns the running
 * number into a display string (e.g. INR formatting).
 */
export default function AnimatedNumber({
  value, format = (n) => String(Math.round(n)), duration = 900, style,
}) {
  const [display, setDisplay] = useState(value || 0);
  const fromRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = value || 0;
    const start = Date.now();
    cancelAnimationFrame(rafRef.current);

    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return <Text style={style}>{format(display)}</Text>;
}
