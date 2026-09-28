import { Code2, Network, ShieldCheck, Swords, Cloud, Brain, Crown, Footprints, Flame, Zap, Layers, Award, Monitor, Terminal, CloudCog, GitBranch, Wrench } from 'lucide-react';

export const ICONS = { Code2, Network, ShieldCheck, Swords, Cloud, Brain, Crown, Footprints, Flame, Zap, Layers, Award, Monitor, Terminal, CloudCog, GitBranch, Wrench };

export const iconFor = (name) => ICONS[name] || Layers;
