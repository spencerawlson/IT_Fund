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
    diagram: { template: 'terms', labels: ['Header'], items: [{ term: 'Header', def: 'Added by each layer' }] },
  },
  {
    title: 'Compare',
    caption: 'TCP is reliable; UDP is fast.',
    diagram: { template: 'compare', labels: ['TCP', 'UDP'] },
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
  it('draws each visual from the slide data: cheat-sheet terms and a comparison', () => {
    const root = renderCarousel();
    const out = text(root);
    expect(out).toContain('Added by each layer');
    expect(out).toContain('TCP');
    expect(out).toContain('UDP');
  });

  it('renders a text-only slide with no visual at all, never a placeholder shape', () => {
    const root = renderCarousel([
      { title: 'Overview', caption: 'Only words here.', diagram: { template: 'text', labels: [] } },
    ]);
    const slide = root.root.findByProps({ 'aria-roledescription': 'slide' });
    expect(slide.findAllByType('svg')).toHaveLength(0);
    expect(slide.findAllByType('ol')).toHaveLength(0);
    expect(text(root)).toContain('Only words here.');
  });

  it('renders the first slide: title, caption, diagram, and a slide counter', () => {
    const root = renderCarousel();
    const out = text(root);
    expect(out).toContain('Overview');
    expect(out).toContain('The');
    expect(out).toContain('model has seven layers.');
    expect(out).toContain('Slide 1 of 3');
    // The diagram is a real inline SVG, not an <img> placeholder.
    // The visual is lesson text: the layer names are drawn as a list.
    expect(text(root)).toContain('Data Link');
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
    // Every slide is in the DOM (one grid cell, so the box never resizes);
    // only the current one is exposed to assistive tech.
    const groups = root.root.findAllByProps({ 'aria-roledescription': 'slide' });
    expect(groups.map((g) => g.props['aria-label'])).toEqual([
      'Slide 1 of 3: Overview', 'Slide 2 of 3: Layers', 'Slide 3 of 3: Compare',
    ]);
    expect(groups.map((g) => g.props['aria-hidden'])).toEqual([undefined, true, true]);
    click(root, 'Next slide');
    const after = root.root.findAllByProps({ 'aria-roledescription': 'slide' });
    expect(after.map((g) => g.props['aria-hidden'])).toEqual([true, undefined, true]);
  });
});

describe('LessonSlideCarousel — slide redesign (outline, templates, Cypher hook)', () => {
  const DECK = [
    { title: 'Overview', caption: 'Roadmap caption.', diagram: { template: 'roadmap', labels: ['Layers', 'Ports'] } },
    { title: 'Layers', caption: 'Stack caption.', diagram: { template: 'layers', labels: ['Application', 'Transport', 'Network'] } },
    { title: 'Merge vs rebase', caption: 'Compare caption.', diagram: { template: 'compare', labels: ['Merge', 'rebase'] } },
    { title: 'Terms', caption: 'Terms caption.', diagram: { template: 'terms', labels: ['TTL'], items: [{ term: 'TTL', def: 'Hops left' }] } },
    { title: 'Syntax', caption: 'Code caption.', diagram: { template: 'keywords', labels: ['git rebase -i', 'HEAD~3'] } },
    { title: 'Plain', caption: 'Text-only caption.', diagram: { template: 'text', labels: [] } },
  ];
  const slideNode = (root, i) => root.root.findAllByProps({ 'aria-roledescription': 'slide' })[i];

  it('draws each supported template from its own data, and a text-only slide with no visual', () => {
    const root = renderCarousel(DECK);
    const all = text(root);
    for (const s of ['Ports', 'Application', 'Transport', 'Merge', 'rebase', 'Hops left', 'git rebase -i', 'HEAD~3', 'Key syntax in this section']) {
      expect(all).toContain(s);
    }
    expect(slideNode(root, 0).findByProps({ 'aria-label': 'What this lesson covers, in order' })).toBeTruthy();
    expect(slideNode(root, 1).findByProps({ 'aria-label': 'Layers, top to bottom' })).toBeTruthy();
    expect(slideNode(root, 3).findAllByType('dl')).toHaveLength(1);
    expect(slideNode(root, 4).findAllByType('figure')).toHaveLength(1);
    const plain = slideNode(root, 5);
    expect(plain.findAllByType('ol')).toHaveLength(0);
    expect(plain.findAllByType('dl')).toHaveLength(0);
    expect(plain.findAllByType('figure')).toHaveLength(0);
  });

  it('the lesson outline lists every slide and jumps to it', () => {
    const root = renderCarousel(DECK);
    const steps = root.root.findByProps({ 'aria-label': 'Lesson outline' }).findAllByType('button');
    expect(steps).toHaveLength(DECK.length);
    expect(steps[0].props['aria-current']).toBe('step');
    click(root, 'Go to slide 4: Terms');
    expect(text(root)).toContain('Slide 4 of 6');
    const after = root.root.findByProps({ 'aria-label': 'Lesson outline' }).findAllByType('button');
    expect(after.map((b) => b.props['aria-current'])).toEqual([undefined, undefined, undefined, 'step', undefined, undefined]);
  });

  it('shows the eyebrow and the 01 / 06 counter', () => {
    let root;
    act(() => { root = TestRenderer.create(<LessonSlideCarousel slides={DECK} eyebrow="Networking · Module 2" />); });
    expect(text(root)).toContain('Networking · Module 2');
    expect(text(root)).toContain('01');
    expect(text(root)).toContain('06');
  });

  it('renders the Cypher integration point for the slide on screen, and nothing when not provided', () => {
    const seen = [];
    let root;
    act(() => {
      root = TestRenderer.create(
        <LessonSlideCarousel slides={DECK} renderExplain={(slide) => { seen.push(slide.title); return <span>{`explain:${slide.title}`}</span>; }} />,
      );
    });
    expect(text(root)).toContain('explain:Overview');
    click(root, 'Next slide');
    expect(seen.at(-1)).toBe('Layers');
    expect(text(root)).toContain('explain:Layers');
    expect(text(renderCarousel(DECK))).not.toContain('explain:');
  });

  it('arrow keys typed inside a form field do not change the slide', () => {
    const root = renderCarousel(DECK);
    act(() => {
      root.root.findByProps({ 'aria-roledescription': 'carousel' }).props.onKeyDown({
        key: 'ArrowRight', preventDefault: () => {}, target: { closest: () => ({}) },
      });
    });
    expect(text(root)).toContain('Slide 1 of 6');
  });

  it('keeps 44px touch targets on every control', () => {
    const root = renderCarousel(DECK);
    for (const b of root.root.findAllByType('button')) {
      expect(b.props.className, b.props['aria-label']).toMatch(/min-h-11/);
    }
  });
});
