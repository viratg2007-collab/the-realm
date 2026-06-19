import { houseById } from '../data/index';

interface HouseBadgeProps {
  houseId?: string;
}

export default function HouseBadge({ houseId }: HouseBadgeProps) {
  if (!houseId) return null;
  const house = houseById.get(houseId);
  if (!house) return null;

  return (
    <span
      className="inline-block text-xs font-sans font-semibold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: house.color, color: '#ffffff' }}
    >
      {house.name}
    </span>
  );
}
