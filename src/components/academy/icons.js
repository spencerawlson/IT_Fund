import { Code2, Network, ShieldCheck, Swords, Cloud, Brain, Crown, Footprints, Flame, Zap, Layers, Award, Monitor, Terminal, CloudCog, GitBranch, Wrench, Waypoints } from 'lucide-react';

export const ICONS = { Code2, Network, ShieldCheck, Swords, Cloud, Brain, Crown, Footprints, Flame, Zap, Layers, Award, Monitor, Terminal, CloudCog, GitBranch, Wrench, Waypoints };

export const iconFor = (name) => ICONS[name] || Layers;
