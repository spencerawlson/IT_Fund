import React from 'react';
import { Lock } from 'lucide-react';
import { Button, Card } from '@/components/ui-glass';

// Friendly paywall: shown where premium content is gated, never a dead end.
// Links to /pricing; signed-out visitors are prompted to sign in first.
export default function UpgradePrompt({ what = 'this content' }) {
  return (
    <Card level={2} padding="lg" className="mx-auto max-w-reading text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-black/[0.04]">
        <Lock size={22} className="text-ink-2" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-heading font-semibold text-ink-1">Premium content</h2>
      <p className="mx-auto mt-2 max-w-md text-body text-ink-2">
        {what} is part of Premium — every track, all labs, and the exam simulators,
        for $19/month. The free tier includes a sample lesson, 50 flashcards, and one lab.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button to="/pricing">See plans — $19/mo</Button>
        <Button variant="ghost" to="/signin">Sign in</Button>
      </div>
    </Card>
  );
}
