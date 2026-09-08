"use client";

import { useEffect, useState, useRef, useCallback } from "react";

interface AnimatedCounterProps {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  startOnView?: boolean;
}

export function AnimatedCounter({
  end,
  duration = 2000,
  prefix = "",
  suffix = "",
  className = "",
  startOnView = true,
}: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const counterRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  const stopAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  const startAnimation = useCallback(() => {
    stopAnimation();
    setCount(0);

    const startTime = Date.now();
    const startValue = 0;

    const animate = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth animation
      const easeOutQuad = (t: number) => t * (2 - t);
      const easedProgress = easeOutQuad(progress);

      const currentCount = Math.floor(
        startValue + (end - startValue) * easedProgress
      );
      setCount(currentCount);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setCount(end);
        animationRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [duration, end, stopAnimation]);

  useEffect(() => {
    if (!startOnView) {
      startAnimation();
      return;
    }

    const currentRef = counterRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            startAnimation();
          } else {
            stopAnimation();
            setCount(0);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
      stopAnimation();
    };
  }, [startOnView, startAnimation, stopAnimation]);

  return (
    <div ref={counterRef} className={className} dir="ltr">
      {prefix}
      {count}
      {suffix}
    </div>
  );
}
