// Normalises the raw track files into tracks -> tiers -> decks -> cards with stable ids.
import python from './python';
import network from './network';
import security from './security';
import cyber from './cyber';
import cloud from './cloud';
import ai from './ai';
import cissp from './cissp';
import interactive from './interactive';
import { TIERS, RESOURCES } from './meta';

export { TIERS, CISSP_DOMAINS, ROADMAP, RESOURCES } from './meta';

function normaliseTrack(raw) {
  const tiers = TIERS.map((tier) => ({
    ...tier,
    decks: (raw.tiers[tier.id] || []).map((deck) => ({
      ...deck,
      trackId: raw.id,
      tierId: tier.id,
      resources: (deck.sources || []).map((id) => ({ id, ...RESOURCES[id] })).filter((r) => r.url),
      puzzles: (interactive[deck.id] || []).map((p, i) => ({ ...p, id: `${deck.id}-p${i}` })),
      cards: deck.cards.map(([q, a, x, wrong], i) => ({
        id: `${deck.id}-${i}`,
        deckId: deck.id,
        trackId: raw.id,
        q,
        a,
        x,
        wrong,
      })),
    })),
  }));
  return { ...raw, tiers };
}

export const tracks = [python, network, security, cyber, cloud, ai, cissp].map(normaliseTrack);

export const allDecks = tracks.flatMap((t) => t.tiers.flatMap((tier) => tier.decks));
export const allCards = allDecks.flatMap((d) => d.cards);

export const getTrack = (id) => tracks.find((t) => t.id === id);
export const getDeck = (id) => allDecks.find((d) => d.id === id);

/** Every resource cited by a track's decks, de-duplicated. */
export function trackResources(track) {
  const seen = new Map();
  track.tiers.forEach((tier) => tier.decks.forEach((d) => d.resources.forEach((r) => seen.set(r.id, r))));
  return [...seen.values()];
}

/** Decks that feed a CISSP domain, across every track. */
export const decksForDomain = (domainId) => allDecks.filter((d) => (d.cissp || []).includes(domainId));
