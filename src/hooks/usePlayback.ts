import { useEffect, useRef, useState } from "react";
export function usePlayback(duration: number) {
  const [time, setTime] = useState(0),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(1),
    [loop, setLoop] = useState(false);
  const stamp = useRef<number | null>(null);
  useEffect(() => {
    if (!playing) {
      stamp.current = null;
      return;
    }
    let id: number;
    const tick = (now: number) => {
      const dt =
        stamp.current === null
          ? 0
          : Math.min((now - stamp.current) / 1000, 0.1);
      stamp.current = now;
      setTime((t) => {
        const next = t + dt * speed;
        if (next >= duration) {
          if (loop && duration) return next % duration;
          setPlaying(false);
          return duration;
        }
        return next;
      });
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(id);
      stamp.current = null;
    };
  }, [playing, speed, loop, duration]);
  const reset = () => {
    setPlaying(false);
    setTime(0);
  };
  const seek = (t: number, limit = duration) => {
    setPlaying(false);
    setTime(Math.max(0, Math.min(limit, t)));
  };
  const toggle = () => {
    if (time >= duration) setTime(0);
    setPlaying((v) => !v);
  };
  return {
    time: Math.min(time, duration),
    playing,
    speed,
    setSpeed,
    loop,
    setLoop,
    reset,
    seek,
    toggle,
  };
}
