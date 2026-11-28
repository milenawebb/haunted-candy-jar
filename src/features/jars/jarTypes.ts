/** Pure types for jars, settings, stats, and the version 2 data document. */
import type { Candy } from '../candy/candyTypes';
import type { Rhythm } from '../people/personTypes';
import type { MonsterKind } from '../tasks/taskTypes';

export const DEFAULT_JAR_IDS = {
  clients: 'jar-clients',
  leads: 'jar-leads',
  friends: 'jar-friends',
  todos: 'jar-todos',
} as const;

export interface Jar {
  id: string;
  name: string;
  defaultRhythm: Rhythm | null;
  order: number;
  monster?: MonsterKind;
}

export type LastContactType = 'call' | 'text' | 'email' | 'other';

export interface Settings {
  deskCap: number; // 1 to 20, default 5
  lastContactType: LastContactType;
}

export interface Stats {
  streak: number;
  bestStreak: number;
  lastContactDay: string | null; // local day key YYYY-MM-DD
}

export interface DataV2 {
  version: 2;
  candies: Candy[];
  jars: Jar[];
  settings: Settings;
  stats: Stats;
}
