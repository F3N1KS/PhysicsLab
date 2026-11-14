import { useCallback, useEffect, useRef, useState } from "react";
export function usePlayback(duration: number) {
  const [time, setTime] = useState(0),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(1),
    [loop, setLoop] = useState(false);
  const position = useRef(0),
    stamp = useRef<number | null>(null);
  useEffect(() => {
    if (!playing) {
      stamp.current = null;
      return;
    }
    let id: number;
    const tick = (now: number) => {
      const dt =
        stamp.current === null ? 0 : Math.max(0, (now - stamp.current) / 1000);
      stamp.current = now;
      let next = position.current + dt * speed;
      if (next >= duration) {
        if (loop && duration) next %= duration;
        else {
          next = duration;
          setPlaying(false);
        }
      }
      position.current = next;
      setTime(next);
      if (next < duration || loop) id = requestAnimationFrame(tick);
    };
    // Hidden tabs pause wall-clock accounting; visible slow frames retain all elapsed time.
    const visibility = () => {
      stamp.current = null;
    };
    document.addEventListener("visibilitychange", visibility);
    id = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(id);
      stamp.current = null;
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [playing, speed, loop, duration]);
  const reset = useCallback(() => {
    setPlaying(false);
    position.current = 0;
    stamp.current = null;
    setTime(0);
  }, []);
  const seek = useCallback(
    (t: number, limit = duration) => {
      setPlaying(false);
      position.current = Math.max(0, Math.min(limit, t));
      stamp.current = null;
      setTime(position.current);
    },
    [duration],
  );
  const toggle = useCallback(() => {
    if (position.current >= duration) {
      position.current = 0;
      setTime(0);
    }
    stamp.current = null;
    setPlaying((v) => !v);
  }, [duration]);
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
