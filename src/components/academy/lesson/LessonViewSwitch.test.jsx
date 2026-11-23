import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import TestRenderer, { act } from 'react-test-renderer';
import LessonViewSwitch, { LESSON_VIEW_KEY, useLessonView } from './LessonViewSwitch';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function radios(root) {
  return root.root.findAll((n) => n.props?.role === 'radio' && n.type === 'button');
}

describe('LessonViewSwitch', () => {
  it('is a labelled radio group: Read and Slides, only the chosen one checked and tabbable', () => {
    let root;
    act(() => { root = TestRenderer.create(<LessonViewSwitch view="read" onChange={() => {}} />); });
    const group = root.root.findByProps({ role: 'radiogroup' });
    expect(group.props['aria-labelledby']).toBe('lesson-view-label');
    expect(radios(root).map((r) => [r.props['data-view'], r.props['aria-checked'], r.props.tabIndex]))
      .toEqual([['read', true, 0], ['slides', false, -1]]);
  });

  it('arrow keys move between the views (wrapping), and clicks choose', () => {
    const onChange = vi.fn();
    let root;
    act(() => { root = TestRenderer.create(<LessonViewSwitch view="read" onChange={onChange} />); });
    const group = root.root.findByProps({ role: 'radiogroup' });
    const key = (k) => group.props.onKeyDown({ key: k, preventDefault: () => {}, currentTarget: { querySelector: () => null } });
    key('ArrowRight');
    expect(onChange).toHaveBeenLastCalledWith('slides');
    key('ArrowLeft');
    expect(onChange).toHaveBeenLastCalledWith('slides'); // wraps from Read backwards
    radios(root)[0].props.onClick();
    expect(onChange).toHaveBeenLastCalledWith('read');
  });
});

describe('useLessonView', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  function Probe({ onView }) {
    const [view, setView] = useLessonView();
    onView(view, setView);
    return null;
  }

  it('remembers the choice in localStorage and restores it on the next lesson', () => {
    const store = {};
    vi.stubGlobal('window', { localStorage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } } });
    let set;
    act(() => { TestRenderer.create(<Probe onView={(_v, s) => { set = s; }} />); });
    act(() => { set('slides'); });
    expect(store[LESSON_VIEW_KEY]).toBe('slides');
    let seen;
    act(() => { TestRenderer.create(<Probe onView={(v) => { seen = v; }} />); });
    expect(seen).toBe('slides');
  });

  it('opens on Read when storage is blocked or holds junk', () => {
    vi.stubGlobal('window', { localStorage: { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } } });
    let seen;
    let set;
    act(() => { TestRenderer.create(<Probe onView={(v, s) => { seen = v; set = s; }} />); });
    expect(seen).toBe('read');
    act(() => { set('slides'); }); // still switches for this page
    expect(seen).toBe('slides');
    vi.stubGlobal('window', { localStorage: { getItem: () => 'video-of-doom', setItem: () => {} } });
    act(() => { TestRenderer.create(<Probe onView={(v) => { seen = v; }} />); });
    expect(seen).toBe('read');
  });
});
