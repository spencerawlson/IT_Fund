// Rich reading content for lessons, keyed by lesson id (= the deck id in src/data/academy).
// One file per course in ./lessons/. Every lesson must have content (lessonContent.test.js); a new
// lesson without it falls back to its summary and sample questions until it is written.
// See the LessonContent typedef in ./schema.js.
import python from './lessons/python';
import network from './lessons/network';
import routing from './lessons/routing';
import security from './lessons/security';
import cyber from './lessons/cyber';
import cloud from './lessons/cloud';
import ai from './lessons/ai';
import cissp from './lessons/cissp';
import linux from './lessons/linux';

/** @type {Record<string, import('./schema').LessonContent>} */
export const LESSON_CONTENT = { ...python, ...network, ...routing, ...security, ...cyber, ...cloud, ...ai, ...cissp, ...linux };
