import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getLesson } from '@/data/catalog';
import {
  BLUEPRINTS_FOR_LESSON,
  BLUEPRINT_POSTER,
  FALLBACK_BLUEPRINT_FOR_SUBJECT,
} from './blueprints';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const publicFile = (src) => join(ROOT, 'public', src.replace(/^\//, ''));

function assertBlueprintFile(src) {
  const path = publicFile(src);
  expect(existsSync(path), `${src} exists under public/`).toBe(true);
  const bytes = readFileSync(path);
  // JPEG magic bytes — a broken or mis-copied asset fails here, not in a browser.
  expect(bytes[0]).toBe(0xff);
  expect(bytes[1]).toBe(0xd8);
  expect(bytes[2]).toBe(0xff);
  expect(bytes.length).toBeGreaterThan(50_000);
}

describe('blueprints map', () => {
  it('maps every sheet to a real lesson in the catalogue', () => {
    const ids = Object.keys(BLUEPRINTS_FOR_LESSON);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      expect(getLesson(id), `lesson ${id} exists`).toBeDefined();
    }
  });

  it('every mapped sheet exists under public/, is a JPEG, and has alt + caption', () => {
    for (const [lessonId, sheets] of Object.entries(BLUEPRINTS_FOR_LESSON)) {
      expect(sheets.length, `${lessonId} has at least one sheet`).toBeGreaterThan(0);
      const seen = new Set();
      for (const sheet of sheets) {
        expect(seen.has(sheet.src), `${lessonId} lists ${sheet.src} twice`).toBe(false);
        seen.add(sheet.src);
        assertBlueprintFile(sheet.src);
        expect(sheet.alt, `${sheet.src} alt text`).toMatch(/\S/);
        expect(sheet.caption, `${sheet.src} caption`).toMatch(/\S/);
      }
    }
  });

  it('the poster lives on a lesson whose Resources section renders', () => {
    const lesson = getLesson(BLUEPRINT_POSTER.lessonId);
    expect(lesson, `poster lesson ${BLUEPRINT_POSTER.lessonId} exists`).toBeDefined();
    expect(lesson.resources.length, 'poster lesson has resource links').toBeGreaterThan(0);
    assertBlueprintFile(BLUEPRINT_POSTER.src);
    expect(BLUEPRINT_POSTER.alt).toMatch(/\S/);
    expect(BLUEPRINT_POSTER.caption).toMatch(/\S/);
  });

  it('the poster is not also a lesson Architecture sheet', () => {
    const lessonSheets = Object.values(BLUEPRINTS_FOR_LESSON).flat().map((s) => s.src);
    expect(lessonSheets).not.toContain(BLUEPRINT_POSTER.src);
  });

  it('Visual Lab fallbacks point at real sheets for real 3D subjects', () => {
    expect(Object.keys(FALLBACK_BLUEPRINT_FOR_SUBJECT).sort()).toEqual(['server-rack', 'switch']);
    for (const src of Object.values(FALLBACK_BLUEPRINT_FOR_SUBJECT)) {
      assertBlueprintFile(src);
    }
  });
});
