import { Link } from "react-router-dom";
export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="PhysicsLab — главная">
      <svg viewBox="0 0 38 38" width="36" height="36" fill="none">
        <path d="M5 27L18 5l14 24H5Z" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M5 27C8 13 23 11 33 10M13 30l8-15"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <circle cx="24" cy="13" r="3" fill="currentColor" />
      </svg>
      <span>
        Physics<span className="brand-light">Lab</span>
        <sup>β</sup>
      </span>
    </Link>
  );
}
