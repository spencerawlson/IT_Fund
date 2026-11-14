// Rich reading content for lessons, keyed by lesson id (= the deck id in src/data/academy).
// AUTHORING SOURCE ONLY: read by scripts/export-content.mjs, which ships the bodies
// behind the entitled content API (backend/content.py). The app must never import
// this module directly — it would bundle every premium lesson body for anonymous
// visitors (audit P0-1). Frontend reads lesson bodies via src/lib/content.js.
// One file per course in ./lessons/. Every lesson must have content (export test);
// a new lesson without it falls back to its summary and sample questions until written.
// See the LessonContent typedef in ./schema.js.
import python from './lessons/python.js';
import network from './lessons/network.js';
import routing from './lessons/routing.js';
import security from './lessons/security.js';
import cyber from './lessons/cyber.js';
import cloud from './lessons/cloud.js';
import ai from './lessons/ai.js';
import awsSaa from './lessons/aws-saa.js';
import awsSecurity from './lessons/aws-security.js';
import cissp from './lessons/cissp.js';
import cpp from './lessons/cpp.js';
import cysa from './lessons/cysa.js';
import docker from './lessons/docker.js';
import git from './lessons/git.js';
import introIt from './lessons/intro-it.js';
import go from './lessons/go.js';
import kubernetes from './lessons/kubernetes.js';
import linux from './lessons/linux.js';
import rust from './lessons/rust.js';
import sql from './lessons/sql.js';
import terraform from './lessons/terraform.js';

/** @type {Record<string, import('./schema').LessonContent>} */
export const LESSON_CONTENT = { ...python, ...network, ...routing, ...security, ...cyber, ...cloud, ...ai, ...awsSaa, ...awsSecurity, ...cysa, ...cissp, ...cpp, ...docker, ...git, ...go, ...kubernetes, ...linux, ...rust, ...sql, ...terraform, ...introIt };
