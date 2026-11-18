interface DirectionArrowProps {
  /** Where the waves or the wind come FROM, in degrees (0 = from the north). */
  from: number;
  /** Spoken name of the direction; leave it out when the text beside the arrow says it. */
  label?: string;
  size?: number;
}

/**
 * An arrow pointing the way the waves or the wind are going, as on a chart: from the
 * north-west, it points to the south-east.
 */
export function DirectionArrow({ from, label, size = 18 }: DirectionArrowProps) {
  return (
    <svg
      className="direction-arrow"
      width={size}
      height={size}
      viewBox="-12 -12 24 24"
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      <g transform={`rotate(${from + 180})`}>
        <path d="M0 -9 L5 3 L0 0.5 L-5 3 Z" fill="currentColor" />
        <line x1="0" y1="0" x2="0" y2="9" stroke="currentColor" strokeWidth="1.6" />
      </g>
    </svg>
  );
}
