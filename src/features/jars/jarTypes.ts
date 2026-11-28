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

/** Default jars (Req 6.1, 6.2). Fixed ids keep migration deterministic. */
export const DEFAULT_JARS: readonly Jar[] = [
  { id: DEFAULT_JAR_IDS.clients, name: 'Clients', defaultRhythm: { n: 30, unit: 'day' }, order: 0 },
  { id: DEFAULT_JAR_IDS.leads, name: 'Leads', defaultRhythm: { n: 14, unit: 'day' }, order: 1 },
  { id: DEFAULT_JAR_IDS.friends, name: 'Friends', defaultRhythm: { n: 60, unit: 'day' }, order: 2 },
  { id: DEFAULT_JAR_IDS.todos, name: 'To-dos', defaultRhythm: null, order: 3 },
];

export const DEFAULT_SETTINGS: Readonly<Settings> = { deskCap: 5, lastContactType: 'call' };

export const DEFAULT_STATS: Readonly<Stats> = { streak: 0, bestStreak: 0, lastContactDay: null };

export interface DataV2 {
  version: 2;
  candies: Candy[];
  jars: Jar[];
  settings: Settings;
  stats: Stats;
}
