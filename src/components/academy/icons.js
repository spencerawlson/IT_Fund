import { Code2, Network, ShieldCheck, Swords, Cloud, Brain, Crown, Footprints, Flame, Zap, Layers, Award, Monitor, Terminal, CloudCog, GitBranch, Wrench, Waypoints, Database, Container, Ship } from 'lucide-react';

export const ICONS = { Code2, Network, ShieldCheck, Swords, Cloud, Brain, Crown, Footprints, Flame, Zap, Layers, Award, Monitor, Terminal, CloudCog, GitBranch, Wrench, Waypoints, Database, Container, Ship };

export const iconFor = (name) => ICONS[name] || Layers;
