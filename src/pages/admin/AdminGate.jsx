// R2C Admin sign-in (admin platform step 2, 2026-11-23).
//
// Replaces the shared password: the admin is the site account (Google/GitHub,
// provider-verified email on the server's allow-list) plus a code from an
// authenticator app. The server decides every step — this page only shows
// the step GET /admin/status reports:
//
//   not signed in        -> sign in with Google/GitHub, returning to /admin
//   signed in, not admin -> say so (nothing else is reachable)
//   admin, no MFA yet    -> set up the authenticator (QR + key), confirm a code
//   admin, MFA set up    -> enter the current 6-digit code
//
// The QR code is drawn in the browser from the otpauth:// URI, so the secret
// is never sent to a third-party QR service.

import React, { useEffect, useState } from 'react';
import { KeyRound, LogIn, Smartphone } from 'lucide-react';
import { adminApi } from '@/api/admin';
import { Button } from '@/components/ui-glass/Button';
import { Card, CardHeader } from '@/components/ui-glass/Card';

const PROVIDER_LABEL = { google: 'Google', github: 'GitHub' };

function Frame({ children }) {
  return <div className="mx-auto min-h-screen w-full max-w-md px-4 py-16">{children}</div>;
}

function errorText(err, fallback) {
  if (err?.status === 429) return 'Too many attempts. Wait a few minutes, then try again.';
  if (err?.status === 401) return 'That code didn’t match. Wait for the next code and try again.';
  return err?.detail || fallback;
}

export function CodeForm({ label, submitLabel, onSubmit, error, loading }) {
  const [code, setCode] = useState('');
  return (
    <form
      className="mt-5 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(code.replace(/\s+/g, ''));
      }}
    >
      <label className="block text-small font-semibold text-ink-1" htmlFor="admin-code">
        {label}
      </label>
      <input
        id="admin-code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9 ]*"
        maxLength={7}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="h-12 w-full rounded-control border border-black/10 bg-white px-3 text-center font-mono text-title tracking-[0.3em] text-ink-1 outline-none placeholder:text-ink-3 focus:border-violet-700/40"
        placeholder="000000"
      />
      {error && (
        <p role="alert" className="text-small font-semibold text-red-700">
          {error}
        </p>
      )}
      <Button type="submit" loading={loading} disabled={code.replace(/\s+/g, '').length !== 6} className="w-full">
        {submitLabel}
      </Button>
    </form>
  );
}

export function SignInStep({ providers }) {
  const list = providers && providers.length ? providers : ['google', 'github'];
  return (
    <Frame>
      <Card level={1}>
        <CardHeader
          eyebrow="Admin only"
          title="Sign in to admin"
          description="Sign in with your own Google or GitHub account first. Only the site owner's verified account can open the admin."
        />
        <div className="mt-5 space-y-2">
          {list.map((p) => (
            // A same-tab link (the shared Button opens href links in a new tab):
            // the OAuth round-trip returns here, to /admin.
            <a
              key={p}
              href={adminApi.signInUrl(p)}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-control border border-violet-700/20 bg-white px-4 text-body font-semibold text-ink-1 transition hover:border-violet-700/40 hover:bg-violet-50"
            >
              <LogIn size={18} aria-hidden="true" />
              {`Continue with ${PROVIDER_LABEL[p] || p}`}
            </a>
          ))}
        </div>
      </Card>
    </Frame>
  );
}

export function NotAdminStep() {
  return (
    <Frame>
      <Card level={1}>
        <CardHeader
          eyebrow="Admin only"
          title="This account isn't an admin"
          description="You're signed in, but this account is not on the admin list. Sign out and sign in with the owner's account to continue."
        />
      </Card>
    </Frame>
  );
}

function QrCode({ uri }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let live = true;
    import('qrcode')
      .then((QR) => QR.toDataURL(uri, { margin: 1, width: 220, errorCorrectionLevel: 'M' }))
      .then((url) => { if (live) setSrc(url); })
      .catch(() => {});
    return () => { live = false; };
  }, [uri]);
  if (!src) return <div className="h-[220px] w-[220px] animate-pulse rounded-control bg-violet-50" aria-hidden="true" />;
  return <img src={src} width={220} height={220} alt="QR code to add Road to CISSP Admin to your authenticator app" className="rounded-control border border-black/10" />;
}

export function SetupStep({ email, onDone }) {
  const [setup, setSetup] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const start = async () => {
    setError('');
    setLoading(true);
    try {
      setSetup(await adminApi.mfaSetup());
    } catch (err) {
      setError(errorText(err, 'Could not start the setup. Try again.'));
    } finally {
      setLoading(false);
    }
  };
  const confirm = async (code) => {
    setError('');
    setLoading(true);
    try {
      await adminApi.mfaActivate(code);
      onDone();
    } catch (err) {
      setError(errorText(err, 'Could not confirm the code.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Frame>
      <Card level={1}>
        <CardHeader
          eyebrow="One-time setup"
          title="Set up two-step sign-in"
          description={`Signed in as ${email}. The admin also needs a code from an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password, Authy…).`}
        />
        {!setup ? (
          <div className="mt-5 space-y-3">
            {error && <p role="alert" className="text-small font-semibold text-red-700">{error}</p>}
            <Button onClick={start} loading={loading} icon={Smartphone} className="w-full">
              Set up my authenticator
            </Button>
          </div>
        ) : (
          <>
            <ol className="mt-5 space-y-4 text-small text-ink-1">
              <li>
                <span className="font-semibold">1. Scan this with your authenticator app.</span>
                <div className="mt-3 flex justify-center">
                  <QrCode uri={setup.otpauth_uri} />
                </div>
              </li>
              <li>
                <span className="font-semibold">Can’t scan?</span> Add an account by setup key:
                <code className="mt-2 block select-all break-all rounded-control bg-violet-50 px-3 py-2 text-center font-mono text-small tracking-wider text-violet-900">
                  {setup.secret.replace(/(.{4})/g, '$1 ').trim()}
                </code>
                <a href={setup.otpauth_uri} className="mt-2 inline-block font-semibold text-action underline-offset-2 hover:underline">
                  On this phone? Open in authenticator
                </a>
              </li>
              <li className="font-semibold">2. Enter the 6-digit code it shows.</li>
            </ol>
            <CodeForm label="Code from your authenticator" submitLabel="Confirm and open admin" onSubmit={confirm} error={error} loading={loading} />
          </>
        )}
      </Card>
    </Frame>
  );
}

export function CodeStep({ email, onDone }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (code) => {
    setError('');
    setLoading(true);
    try {
      await adminApi.login(code);
      onDone();
    } catch (err) {
      setError(errorText(err, 'Could not sign in.'));
    } finally {
      setLoading(false);
    }
  };
  return (
    <Frame>
      <Card level={1}>
        <CardHeader
          eyebrow="Admin only"
          title="Enter your code"
          description={`Signed in as ${email}. Open your authenticator app and enter the current code for Road to CISSP Admin.`}
        />
        <CodeForm label="6-digit code" submitLabel="Open admin" onSubmit={submit} error={error} loading={loading} />
        <p className="mt-4 flex items-start gap-2 text-caption text-ink-2">
          <KeyRound size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          Lost your phone? The site owner can reset two-step sign-in from the server.
        </p>
      </Card>
    </Frame>
  );
}

/** Picks the step from GET /admin/status. `onAuthed` is called once the admin session is live. */
export default function AdminGate({ status, onAuthed }) {
  const [providers, setProviders] = useState(null);
  useEffect(() => {
    if (status?.signed_in) return undefined;
    let live = true;
    adminApi.providers().then((d) => { if (live) setProviders(d.providers || []); }, () => {});
    return () => { live = false; };
  }, [status?.signed_in]);

  if (!status?.signed_in) return <SignInStep providers={providers} />;
  if (!status.eligible) return <NotAdminStep />;
  if (!status.mfa_enrolled) return <SetupStep email={status.email} onDone={onAuthed} />;
  return <CodeStep email={status.email} onDone={onAuthed} />;
}
