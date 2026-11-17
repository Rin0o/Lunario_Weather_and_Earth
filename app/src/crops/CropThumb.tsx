import { plateFor } from '../assets/plates.ts';

/**
 * The crop's plate, small, beside its name (crop list, garden cards, sowing chips). Decorative:
 * the name next to it says the same. Its size comes from where it is placed.
 */
export function CropThumb({ cropId }: { cropId: string }) {
  const plate = plateFor(cropId);
  if (!plate) return null;
  return (
    <span className="crop-thumb" aria-hidden="true">
      <img src={plate.thumb} alt="" loading="lazy" decoding="async" />
    </span>
  );
}
