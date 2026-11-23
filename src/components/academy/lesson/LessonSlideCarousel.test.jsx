import React from 'react';
import { describe, it, expect } from 'vitest';
import TestRenderer, { act } from 'react-test-renderer';
import LessonSlideCarousel from './LessonSlideCarousel';

// react-test-renderer needs the act environment flag in a DOM-less run.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Fixture deck: three slides, captions in the lesson's own words (one with
// inline `code`, as real lesson paragraphs carry). Written BEFORE the
// component and observed failing (module does not exist on pristine code).
const SLIDES = [
  {
    title: 'Overview',
    caption: 'The `OSI` model has seven layers.',
    diagram: { template: 'layers', labels: ['Physical', 'Data Link', 'Network', 'Transport', 'Session', 'Presentation', 'Application'] },
  },
  {
    title: 'Layers',
    caption: 'Each layer adds its own header.',
    diagram: { template: 'flow', labels: [] },
  },
  {
    title: 'Compare',
    caption: 'TCP is reliable; UDP is fast.',
    diagram: { template: 'comparison', labels: [] },
  },
];

function renderCarousel(slides = SLIDES) {
  let root;
  act(() => {
    root = TestRenderer.create(<LessonSlideCarousel slides={slides} />);
  });
  return root;
}

function text(root) {
  return JSON.stringify(root.toJSON());
}

function click(root, ariaLabel) {
  act(() => {
    root.root.findByProps({ 'aria-label': ariaLabel }).props.onClick();
  });
}

function keyDown(root, key) {
  act(() => {
    root.root.findByProps({ 'aria-roledescription': 'carousel' }).props.onKeyDown({ key, preventDefault: () => {} });
  });
}

function swipe(root, fromX, toX) {
  const region = root.root.findByProps({ 'aria-roledescription': 'carousel' });
  act(() => {
    region.props.onTouchStart({ changedTouches: [{ clientX: fromX }] });
  });
  act(() => {
    region.props.onTouchEnd({ changedTouches: [{ clientX: toX }] });
  });
}

describe('LessonSlideCarousel', () => {
  it('renders the first slide: title, caption, diagram, and a slide counter', () => {
    const root = renderCarousel();
    const out = text(root);
    expect(out).toContain('Overview');
    expect(out).toContain('The');
    expect(out).toContain('model has seven layers.');
    expect(out).toContain('Slide 1 of 3');
    // The diagram is a real inline SVG, not an <img> placeholder.
    expect(root.root.findAllByType('svg').length).toBeGreaterThan(0);
    // Inline `code` in a caption renders as a <code> element (RichText).
    expect(root.root.findAllByType('code').map((n) => n.children.join(''))).toContain('OSI');
  });

  it('Next advances one slide and Previous goes back; buttons disable at the ends', () => {
    const root = renderCarousel();
    click(root, 'Next slide');
    expect(text(root)).toContain('Each layer adds its own header.');
    expect(text(root)).toContain('Slide 2 of 3');
    click(root, 'Previous slide');
    expect(text(root)).toContain('model has seven layers.');
    expect(text(root)).toContain('Slide 1 of 3');
    expect(root.root.findByProps({ 'aria-label': 'Previous slide' }).props.disabled).toBe(true);
    click(root, 'Next slide');
    click(root, 'Next slide');
    expect(text(root)).toContain('TCP is reliable; UDP is fast.');
    expect(root.root.findByProps({ 'aria-label': 'Next slide' }).props.disabled).toBe(true);
  });

  it('dots jump straight to a slide', () => {
    const root = renderCarousel();
    click(root, 'Go to slide 3: Compare');
    expect(text(root)).toContain('TCP is reliable; UDP is fast.');
    expect(text(root)).toContain('Slide 3 of 3');
  });

  it('arrow keys move between slides', () => {
    const root = renderCarousel();
    keyDown(root, 'ArrowRight');
    expect(text(root)).toContain('Each layer adds its own header.');
    keyDown(root, 'ArrowLeft');
    expect(text(root)).toContain('model has seven layers.');
    keyDown(root, 'ArrowLeft');
    expect(text(root)).toContain('Slide 1 of 3');
  });

  it('a horizontal swipe moves between slides; a short drag does not', () => {
    const root = renderCarousel();
    swipe(root, 200, 100);
    expect(text(root)).toContain('Each layer adds its own header.');
    swipe(root, 100, 200);
    expect(text(root)).toContain('model has seven layers.');
    swipe(root, 200, 180);
    expect(text(root)).toContain('Slide 1 of 3');
  });

  it('renders nothing when there are no slides', () => {
    expect(renderCarousel([]).toJSON()).toBeNull();
    // Note: renderCarousel() with no argument defaults to the fixture deck,
    // so the undefined case is rendered directly here.
    let missing;
    act(() => {
      missing = TestRenderer.create(<LessonSlideCarousel slides={undefined} />);
    });
    expect(missing.toJSON()).toBeNull();
  });

  it('labels the carousel accessibly', () => {
    const root = renderCarousel();
    const region = root.root.findByProps({ 'aria-roledescription': 'carousel' });
    expect(region.props['aria-label']).toBe('Lesson slides');
    const group = root.root.findByProps({ 'aria-roledescription': 'slide' });
    expect(group.props['aria-label']).toBe('Slide 1 of 3: Overview');
  });
});
