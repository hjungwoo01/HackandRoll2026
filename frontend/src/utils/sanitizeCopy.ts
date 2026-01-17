/**
 * Sanitizes text by removing banned keywords that emphasize rarity
 */
const bannedKeywords = [
  'rare',
  'vintage',
  'exclusive',
  'epic',
  'legendary',
  'ultra',
  'collector',
  'collector-grade',
  'limited',
  'one-of-one',
];

/**
 * Removes banned keywords from text using word boundaries
 */
export function sanitizeCopy(text: string): string {
  if (!text) return text;
  
  let sanitized = text;
  for (const keyword of bannedKeywords) {
    // Use word boundaries to avoid removing substrings in legitimate words
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    sanitized = sanitized.replace(regex, '');
  }
  
  // Clean up extra spaces
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  return sanitized;
}

/**
 * Maps rarity values to Set names for UI display
 */
export function rarityToSet(rarity: string): string {
  switch (rarity.toLowerCase()) {
    case 'common':
      return 'Set A';
    case 'rare':
      return 'Set B';
    case 'epic':
      return 'Set C';
    default:
      return rarity;
  }
}

/**
 * Gets color classes for set-based styling (replaces rarity glow)
 */
export function getSetColor(rarity: string): string {
  switch (rarity.toLowerCase()) {
    case 'common':
      return 'border-gray-300 bg-gray-50';
    case 'rare':
      return 'border-blue-300 bg-blue-50';
    case 'epic':
      return 'border-purple-300 bg-purple-50';
    default:
      return 'border-gray-300 bg-gray-50';
  }
}
