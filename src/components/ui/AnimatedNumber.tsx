import React, { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface AnimatedNumberProps {
  value: number | string;
  prefix?: string;
  suffix?: string;
  className?: string;
  formatFn?: (val: number) => string;
}

export default function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
  className = '',
  formatFn
}: AnimatedNumberProps) {
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const springValue = useSpring(0, { bounce: 0, duration: 800 });
  
  const displayValue = useTransform(springValue, (current) => {
    if (formatFn) return `${prefix}${formatFn(current)}${suffix}`;
    
    // Default formatting
    const formatted = typeof current === 'number' 
      ? Math.round(current).toLocaleString(undefined, { maximumFractionDigits: 0 })
      : current;
      
    return `${prefix}${formatted}${suffix}`;
  });

  useEffect(() => {
    setIsMounted(true);
    springValue.set(typeof value === 'number' ? value : Number(value) || 0);
  }, [value, springValue]);

  if (!isMounted) {
    const numericValue = typeof value === 'number' ? value : Number(value) || 0;
    const formatted = formatFn 
      ? formatFn(numericValue) 
      : numericValue.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return <span className={className}>{prefix}{formatted}{suffix}</span>;
  }

  return <motion.span className={className}>{displayValue}</motion.span>;
}
