import { Code2, Network, ShieldCheck, Swords, Cloud, Brain, Crown, Footprints, Flame, Zap, Layers, Award } from 'lucide-react';

export const ICONS = { Code2, Network, ShieldCheck, Swords, Cloud, Brain, Crown, Footprints, Flame, Zap, Layers, Award };

export const iconFor = (name) => ICONS[name] || Layers;
