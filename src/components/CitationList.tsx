import type { SourceRef } from '../types';
import { sourceById } from '../data/index';

interface CitationListProps {
  refs: SourceRef[];
}

function formatCitation(ref: SourceRef): string {
  const source = sourceById.get(ref.source_id);
  if (!source) return ref.source_id;

  const parts: string[] = [];

  // Author: last name only if available
  if (source.author) {
    const author = Array.isArray(source.author) ? source.author[0] : source.author;
    // Extract last name: "Smith, J." → "Smith", "J. Smith" → "Smith"
    const lastName = author.includes(',')
      ? author.split(',')[0].trim()
      : author.split(' ').pop() ?? author;
    parts.push(`${lastName} (${source.year ?? ''})`);
  } else if (source.year) {
    parts.push(`(${source.year})`);
  }

  parts.push(source.entry ?? source.title);

  if (ref.locator) {
    parts.push(`— ${ref.locator}`);
  }

  return parts.join(', ').replace(', —', ' —');
}

export default function CitationList({ refs }: CitationListProps) {
  if (!refs || refs.length === 0) return null;

  return (
    <ul className="list-none mt-1 space-y-0.5">
      {refs.map((ref, i) => (
        <li key={`${ref.source_id}-${i}`} className="text-xs text-text-muted font-sans">
          {formatCitation(ref)}
        </li>
      ))}
    </ul>
  );
}
