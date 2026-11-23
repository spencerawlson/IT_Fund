import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button, Card, CardHeader } from '@/components/ui-glass';
import { deleteOwnAccount } from '@/api/account';

// Self-service account deletion (App Store Guideline 5.1.1(v)).
// Two-step confirm, following the admin DeleteAccountConfirm pattern: the
// first click only opens the confirm step; the delete itself needs the
// second click. The account page passes onDeleted (sign out + go home);
// without it, the fallback is a plain navigation home.
//
// Apple subscriptions: the backend has no Apple subscription state yet —
// a subscription bought through the App Store is managed by Apple, not by
// Stripe, so deleting the account here cannot cancel it. The confirm step
// says so plainly and tells the user to cancel in iOS Settings first.
export function DeleteAccountSection({ onDeleted } = {}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteOwnAccount();
      if (onDeleted) onDeleted();
      else window.location.assign('/');
    } catch (err) {
      setError(err.detail || err.message || 'Delete failed. Please try again.');
      setBusy(false);
    }
  };

  return (
    <Card level={2} padding="lg" className="mt-6">
      <CardHeader
        title="Delete account"
        description="Permanently remove your account, progress, and lab history."
      />
      {!confirming ? (
        <>
          <p className="mt-3 text-body text-ink-2">
            Deleting your account permanently removes your progress, lab history, and sign-in sessions,
            and cancels your Stripe subscription so you are not charged again. This cannot be undone.
          </p>
          <div className="mt-5">
            <Button variant="secondary" icon={Trash2} className="text-red-700" onClick={() => setConfirming(true)}>
              Delete account
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-3 font-semibold text-ink-1">Delete your account?</p>
          <p className="mt-2 text-body text-ink-2">
            Your progress, lab history, and sign-in sessions will be permanently removed, and your
            subscription will be canceled. This cannot be undone.
          </p>
          <p className="mt-2 text-body text-ink-2">
            If you subscribed through the App Store, cancel that subscription in iOS Settings first —
            open Settings, tap your name, then Subscriptions. Deleting your account here does not
            cancel an Apple subscription.
          </p>
          {error && (
            <p role="alert" className="mt-3 text-small text-danger">
              {error}
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              variant="secondary"
              icon={Trash2}
              className="text-red-700"
              loading={busy}
              disabled={busy}
              onClick={handleDelete}
            >
              {busy ? 'Deleting…' : 'Yes, delete my account'}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => { setConfirming(false); setError(null); }}>
              Cancel
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
