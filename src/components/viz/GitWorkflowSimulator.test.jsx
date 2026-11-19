import React from 'react';
import { describe, it, expect } from 'vitest';
import TestRenderer, { act } from 'react-test-renderer';
import GitWorkflowSimulator from './GitWorkflowSimulator';
import { SUBJECTS, RENDERERS } from '../../pages/Lab';

// react-test-renderer needs the act environment flag in a DOM-less run.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function textOf(node) {
  const children = node.props?.children;
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.filter((c) => typeof c === 'string' || typeof c === 'number').join('');
  return '';
}

function buttonWithText(root, text) {
  const buttons = root.findAllByType('button');
  const match = buttons.find((b) => textOf(b).trim() === text);
  expect(match, `button "${text}"`).toBeDefined();
  return match;
}

function commandButton(root, label) {
  const buttons = root.findAllByType('button');
  const match = buttons.find((b) => b.props['aria-label'] === label);
  expect(match, `command button "${label}"`).toBeDefined();
  return match;
}

function hasText(root, text) {
  return root.findAll((node) => {
    const children = node.props?.children;
    if (typeof children === 'string') return children.includes(text);
    if (typeof children === 'number') return String(children).includes(text);
    if (Array.isArray(children)) return children.some((c) => (typeof c === 'string' || typeof c === 'number') && String(c).includes(text));
    return false;
  }).length > 0;
}

function terminalText(root) {
  return root.findByType('pre').props.children;
}

function renderSimulator() {
  let root;
  act(() => {
    root = TestRenderer.create(<GitWorkflowSimulator />);
  });
  return root;
}

function click(button) {
  act(() => {
    button.props.onClick();
  });
}

describe('Git Workflow Visual Lab subject', () => {
  it('is registered as the git-workflow renderer and keeps kind blueprint', () => {
    const subject = SUBJECTS.find((s) => s.id === 'git-workflow');
    expect(subject).toBeDefined();
    expect(subject.kind).toBe('blueprint');
    expect(subject.category).toBe('DevOps');
    expect(RENDERERS['git-workflow']).toBeDefined();
    expect(typeof RENDERERS['git-workflow']).toBe('function');
    let rendered;
    act(() => {
      rendered = TestRenderer.create(React.createElement(RENDERERS['git-workflow']));
    });
    expect(hasText(rendered.root, 'Guided story')).toBe(true);
    act(() => rendered.unmount());
  });

  it('renders the ten commands in the Reel order, plus edit, reset and the terminal', () => {
    const root = renderSimulator();
    const labels = root.root.findAllByType('button')
      .map((b) => b.props['aria-label'])
      .filter(Boolean);
    expect(labels).toEqual([
      'git init', 'git status', 'git add', 'git commit', 'git branch',
      'git switch', 'git merge', 'git stash', 'git pull', 'git push',
    ]);
    expect(hasText(root.root, 'Edit file')).toBe(true);
    expect(hasText(root.root, 'Reset — fresh folder')).toBe(true);
    expect(hasText(root.root, 'Working Tree')).toBe(true);
    expect(hasText(root.root, 'Staging Area')).toBe(true);
    expect(hasText(root.root, 'Local Repo')).toBe(true);
    expect(hasText(root.root, 'Remote Origin')).toBe(true);
    expect(terminalText(root.root)).toContain('Run `git init` to create the repository');
  });

  it('guided mode locks later commands until the earlier ones run', () => {
    const root = renderSimulator();
    expect(commandButton(root.root, 'git init').props.disabled).toBe(false);
    expect(commandButton(root.root, 'git status').props.disabled).toBe(true);
    expect(commandButton(root.root, 'git push').props.disabled).toBe(true);
    expect(hasText(root.root, 'Step 1 of 10 — git init.')).toBe(true);

    click(commandButton(root.root, 'git init'));
    expect(hasText(root.root, 'Step 2 of 10 — git status.')).toBe(true);
    expect(commandButton(root.root, 'git status').props.disabled).toBe(false);
    expect(commandButton(root.root, 'git add').props.disabled).toBe(true);
    expect(terminalText(root.root)).toContain('Initialized empty Git repository');
  });

  it('free play unlocks every command in any order', () => {
    const root = renderSimulator();
    click(buttonWithText(root.root, 'Free play'));
    for (const label of ['git init', 'git status', 'git add', 'git commit', 'git push']) {
      expect(commandButton(root.root, label).props.disabled).toBe(false);
    }
    expect(hasText(root.root, 'Free play — run the commands in any order.')).toBe(true);
  });

  it('runs the Reel story: init → add → commit shows in the terminal', () => {
    const root = renderSimulator();
    click(buttonWithText(root.root, 'Free play'));
    click(commandButton(root.root, 'git init'));
    click(commandButton(root.root, 'git add'));
    click(commandButton(root.root, 'git commit'));
    const terminal = terminalText(root.root);
    expect(terminal).toContain('$ git init');
    expect(terminal).toContain('$ git add .');
    expect(terminal).toContain('Staged: app.js, cart.js, style.css');
    expect(terminal).toContain('[main (root-commit) c1] Initial commit');
    expect(hasText(root.root, 'Local Repo')).toBe(true);
  });

  it('edit file changes the working tree and shows in the terminal', () => {
    const root = renderSimulator();
    click(buttonWithText(root.root, 'Free play'));
    click(commandButton(root.root, 'git init'));
    click(commandButton(root.root, 'git commit'));
    const select = root.root.findAllByType('select').find((s) => s.props['aria-label'] === 'File to edit');
    expect(select).toBeDefined();
    act(() => {
      select.props.onChange({ target: { value: 'style.css' } });
    });
    click(buttonWithText(root.root, 'Edit file'));
    expect(terminalText(root.root)).toContain('style.css edited in the working tree');
  });

  it('stash pop and teammate push start disabled', () => {
    const root = renderSimulator();
    expect(buttonWithText(root.root, 'git stash pop').props.disabled).toBe(true);
    expect(buttonWithText(root.root, 'Teammate pushes to origin').props.disabled).toBe(true);
  });

  it('reset restores the fresh folder', () => {
    const root = renderSimulator();
    click(buttonWithText(root.root, 'Free play'));
    click(commandButton(root.root, 'git init'));
    expect(terminalText(root.root)).toContain('Initialized empty Git repository');
    click(buttonWithText(root.root, 'Reset — fresh folder'));
    expect(terminalText(root.root)).toContain('Reset — fresh folder');
    expect(hasText(root.root, 'Step 1 of 10 — git init.')).toBe(false);
  });

  it('reveals check-yourself answers on demand', () => {
    const root = renderSimulator();
    const question = 'You edited two files, but `git commit` says "nothing to commit". Why?';
    expect(hasText(root.root, question)).toBe(true);
    expect(hasText(root.root, 'Nothing is staged.')).toBe(false);
    const reveal = root.root.findAllByType('button').find((b) => textOf(b).trim() === 'Reveal answer');
    expect(reveal).toBeDefined();
    click(reveal);
    expect(hasText(root.root, 'Nothing is staged.')).toBe(true);
  });

  it('shows the brief, exercises and debrief below the fold', () => {
    const root = renderSimulator();
    expect(hasText(root.root, 'Lab brief — the Git workflow')).toBe(true);
    expect(hasText(root.root, 'Exercises — in order')).toBe(true);
    expect(hasText(root.root, 'Push rejected.')).toBe(true);
    expect(hasText(root.root, 'Debrief — what you should have seen')).toBe(true);
    expect(hasText(root.root, 'Exam lens')).toBe(true);
  });
});
