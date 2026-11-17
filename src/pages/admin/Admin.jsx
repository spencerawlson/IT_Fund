// Admin panel — Spencer-only, password-gated, browser-only via the direct URL
// /admin. No link to it exists anywhere in the normal navigation, and the
// AppShell never renders it. All data comes from /api/admin/*, which enforces
// the server-side admin session on every call.
//
// Views: overview (counts + MRR), accounts (all users + progress +
// subscription status), subscriptions (stored Stripe state + totals), AI costs
// (tutor call log: calls, tokens, cost — history starts when logging ships).
import React, { useCallback, useEffect, useState } from 'react';
import { Shield, LogOut, Search } from 'lucide-react';
import { adminApi } from '@/api/admin';
import { Button } from '@/components/ui-glass/Button';
import { Card, CardHeader } from '@/components/ui-glass/Card';

export const UNKNOWN = 'unknown';

export function fmtDate(iso) {
  if (!iso) return UNKNOWN;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return UNKNOWN;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function fmtUsd(n, digits = 2) {
  if (n === null || n === undefined) return UNKNOWN;
  return `$${Number(n).toFixed(digits)}`;
}

// Reserved seats: the dummy accounts waiting to become real people. Their
// emails all end in @road2cissp.local — the badge makes them visible at a
// glance on the board (and in the report).
export const RESERVED_EMAIL_SUFFIX = '@road2cissp.local';

export function isReservedSeat(email) {
  return typeof email === 'string' && email.toLowerCase().endsWith(RESERVED_EMAIL_SUFFIX);
}

function Shell({ action, children }) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-control bg-action-surface text-action-surface-ink">
            <Shield size={20} aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-title text-ink-1">Admin</h1>
            <p className="text-small text-ink-2">Road to CISSP — accounts, subscriptions, AI costs</p>
          </div>
        </div>
        {action}
      </header>
      {children}
    </div>
  );
}

export function AdminLoginForm({ onSubmit, error, loading }) {
  const [password, setPassword] = useState('');
  return (
    <div className="mx-auto min-h-screen w-full max-w-md px-4 py-16">
      <Card level={1}>
        <CardHeader
          eyebrow="Admin only"
          title="Sign in to admin"
          description="Enter the admin password. This area is not linked from anywhere in the app."
        />
        <form
          className="mt-5 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(password);
          }}
        >
          <label className="block text-small font-semibold text-ink-1" htmlFor="admin-password">
            Admin password
          </label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 w-full rounded-control border border-black/10 bg-white px-3 text-body text-ink-1 outline-none placeholder:text-ink-2 focus:border-violet-700/40"
            placeholder="Admin password"
          />
          {error && (
            <p role="alert" className="text-small font-semibold text-red-700">
              {error}
            </p>
          )}
          <Button type="submit" loading={loading} className="w-full">
            Sign in
          </Button>
        </form>
      </Card>
    </div>
  );
}

export function StatCard({ label, value, sub }) {
  return (
    <Card level={1} padding="sm">
      <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">{label}</p>
      <p className="mt-1 text-title text-ink-1">{value}</p>
      {sub && <p className="mt-1 text-small text-ink-2">{sub}</p>}
    </Card>
  );
}

export function OverviewView({ data }) {
  if (!data) return <p className="text-body text-ink-2">Loading…</p>;
  const mrr = data.mrr;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Accounts" value={data.total_users} />
      <StatCard label="Paying subscribers" value={data.paying_subscribers} />
      <StatCard
        label="Monthly recurring revenue"
        value={mrr ? fmtUsd(mrr.amount) : UNKNOWN}
        sub={mrr ? `${mrr.price_display}/mo × ${mrr.paying_count} paying — ${mrr.source}` : 'Stripe is not configured, so revenue is unknown.'}
      />
      <StatCard
        label="AI tutor cost · 30 days"
        value={fmtUsd(data.ai_cost_30d_usd, 6)}
        sub={`${data.ai_calls_30d} calls in the last 30 days`}
      />
      <StatCard
        label="Manual enrollments"
        value={data.manual_grants_active ?? 0}
        sub="Granted in person — access until revoked, never billed through Stripe."
      />
    </div>
  );
}

export function EditAccountForm({ account, onSubmit, onCancel, busy, error }) {
  const [displayName, setDisplayName] = useState(account.display_name || '');
  const [email, setEmail] = useState(account.email || '');
  return (
    <form
      className="min-w-[220px] space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ display_name: displayName.trim(), email: email.trim() });
      }}
    >
      <div>
        <label className="block text-small font-semibold text-ink-1" htmlFor={`edit-name-${account.id}`}>
          Name
        </label>
        <input
          id={`edit-name-${account.id}`}
          type="text"
          required
          maxLength={120}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="mt-1 h-9 w-full rounded-control border border-black/10 bg-white px-2 text-small text-ink-1 outline-none placeholder:text-ink-2 focus:border-violet-700/40"
        />
      </div>
      <div>
        <label className="block text-small font-semibold text-ink-1" htmlFor={`edit-email-${account.id}`}>
          Email
        </label>
        <input
          id={`edit-email-${account.id}`}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 h-9 w-full rounded-control border border-black/10 bg-white px-2 text-small text-ink-1 outline-none placeholder:text-ink-2 focus:border-violet-700/40"
        />
      </div>
      {error && (
        <p role="alert" className="text-small font-semibold text-red-700">
          {error}
        </p>
      )}
      <span className="flex gap-2">
        <Button type="submit" variant="secondary" size="sm" loading={busy}>
          Save changes
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </span>
    </form>
  );
}

export function DeleteAccountConfirm({ account, onConfirm, onCancel, busy, error }) {
  const label = account.display_name ? `${account.display_name} (${account.email})` : account.email;
  return (
    <div className="min-w-[220px] space-y-2">
      <p className="font-semibold text-ink-1">Delete {label}?</p>
      <p className="text-ink-2">This removes the account from the board and revokes its manual grant. This cannot be undone.</p>
      {error && (
        <p role="alert" className="text-small font-semibold text-red-700">
          {error}
        </p>
      )}
      <span className="flex gap-2">
        <Button variant="secondary" size="sm" loading={busy} className="text-red-700" onClick={onConfirm}>
          Delete account
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </span>
    </div>
  );
}

export function AccountsTable({ items, total, page, pageSize, onPage, onGrant, onRevoke, onEdit, onDelete, busyId }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const [grantingId, setGrantingId] = useState(null);
  const [grantNote, setGrantNote] = useState('');
  const [confirmRevokeId, setConfirmRevokeId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editError, setEditError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const showActions = typeof onGrant === 'function';
  const showManage = typeof onEdit === 'function' || typeof onDelete === 'function';
  return (
    <Card level={1}>
      <CardHeader title="Accounts" description={`${total} account${total === 1 ? '' : 's'} total.`} />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-small">
          <thead>
            <tr className="border-b border-black/10 text-caption uppercase tracking-wider text-ink-2">
              <th className="py-2 pr-3">Account</th>
              <th className="py-2 pr-3">Signed up</th>
              <th className="py-2 pr-3">Last active</th>
              <th className="py-2 pr-3">Lessons passed</th>
              <th className="py-2 pr-3">Labs done</th>
              <th className="py-2 pr-3">Subscription</th>
              {showActions && <th className="py-2 pr-3">Manual access</th>}
              {showManage && <th className="py-2">Manage</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((a) => {
              const grant = a.manual_grant || null;
              const grantActive = grant?.active === true;
              return (
                <tr key={a.id} className="border-b border-black/[0.06] text-ink-1">
                  <td className="py-2 pr-3">
                    <span className="block font-semibold">
                      {a.display_name || a.email || UNKNOWN}
                      {isReservedSeat(a.email) && (
                        <span className="ml-2 inline-flex items-center rounded-full border border-violet-700/20 bg-violet-100 px-2 py-0.5 align-middle text-caption font-semibold text-violet-800">
                          Reserved
                        </span>
                      )}
                    </span>
                    {a.email && a.display_name && <span className="block text-ink-2">{a.email}</span>}
                  </td>
                  <td className="py-2 pr-3">{fmtDate(a.created_at)}</td>
                  <td className="py-2 pr-3">{fmtDate(a.last_active)}</td>
                  <td className="py-2 pr-3">{a.lessons_passed}</td>
                  <td className="py-2 pr-3">{a.labs_completed}</td>
                  <td className="py-2 pr-3">{a.subscription_status}</td>
                  {showActions && (
                    <td className="py-2">
                      {grantActive ? (
                        <div className="space-y-1">
                          <span className="block font-semibold">Granted {fmtDate(grant.granted_at)}</span>
                          {grant.note && <span className="block text-ink-2">{grant.note}</span>}
                          {confirmRevokeId === a.id ? (
                            <span className="flex gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled={busyId === a.id}
                                onClick={() => {
                                  setConfirmRevokeId(null);
                                  onRevoke(a.id);
                                }}
                              >
                                Confirm revoke?
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setConfirmRevokeId(null)}>
                                Cancel
                              </Button>
                            </span>
                          ) : (
                            <Button variant="secondary" size="sm" disabled={busyId === a.id} onClick={() => setConfirmRevokeId(a.id)}>
                              Revoke
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {grant?.revoked_at && (
                            <span className="block text-ink-2">Revoked {fmtDate(grant.revoked_at)}</span>
                          )}
                          {grantingId === a.id ? (
                            <span className="block space-y-2">
                              <input
                                type="text"
                                value={grantNote}
                                onChange={(e) => setGrantNote(e.target.value)}
                                placeholder="Note (optional)"
                                aria-label="Grant note"
                                maxLength={500}
                                className="h-9 w-full min-w-[160px] rounded-control border border-black/10 bg-white px-2 text-small text-ink-1 outline-none placeholder:text-ink-2 focus:border-violet-700/40"
                              />
                              <span className="flex gap-2">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  disabled={busyId === a.id}
                                  onClick={() => {
                                    onGrant(a.id, grantNote);
                                    setGrantingId(null);
                                    setGrantNote('');
                                  }}
                                >
                                  Grant access
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setGrantingId(null);
                                    setGrantNote('');
                                  }}
                                >
                                  Cancel
                                </Button>
                              </span>
                            </span>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={busyId === a.id}
                              onClick={() => setGrantingId(a.id)}
                            >
                              Grant access
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                  )}
                  {showManage && (
                    <td className="py-2">
                      {editingId === a.id ? (
                        <EditAccountForm
                          account={a}
                          busy={busyId === a.id}
                          error={editError}
                          onCancel={() => {
                            setEditingId(null);
                            setEditError('');
                          }}
                          onSubmit={async (values) => {
                            setEditError('');
                            try {
                              await onEdit(a.id, values);
                              setEditingId(null);
                            } catch (e) {
                              setEditError(e.detail || e.message || 'Could not save changes.');
                            }
                          }}
                        />
                      ) : confirmDeleteId === a.id ? (
                        <DeleteAccountConfirm
                          account={a}
                          busy={busyId === a.id}
                          error={deleteError}
                          onCancel={() => {
                            setConfirmDeleteId(null);
                            setDeleteError('');
                          }}
                          onConfirm={async () => {
                            setDeleteError('');
                            try {
                              await onDelete(a.id);
                              setConfirmDeleteId(null);
                            } catch (e) {
                              setDeleteError(e.detail || e.message || 'Could not delete this account.');
                            }
                          }}
                        />
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {typeof onEdit === 'function' && (
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={busyId === a.id}
                              onClick={() => {
                                setEditingId(a.id);
                                setEditError('');
                                setConfirmDeleteId(null);
                              }}
                            >
                              Edit
                            </Button>
                          )}
                          {typeof onDelete === 'function' && (
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={busyId === a.id}
                              className="text-red-700"
                              onClick={() => {
                                setConfirmDeleteId(a.id);
                                setDeleteError('');
                                setEditingId(null);
                              }}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={6 + (showActions ? 1 : 0) + (showManage ? 1 : 0)} className="py-4 text-ink-2">
                  No accounts match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-small text-ink-2">
          Page {page} of {pages}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
            Previous
          </Button>
          <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
            Next
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function SubscriptionsView({ data }) {
  if (!data) return <p className="text-body text-ink-2">Loading…</p>;
  const mrr = data.mrr;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Monthly recurring revenue" value={mrr ? fmtUsd(mrr.amount) : UNKNOWN} sub={mrr ? `${mrr.price_display}/mo × ${mrr.paying_count} paying — ${mrr.source}` : 'Stripe is not configured, so revenue is unknown.'} />
        {Object.entries(data.totals_by_status).map(([status, n]) => (
          <StatCard key={status} label={`Status: ${status}`} value={n} />
        ))}
      </div>
      <Card level={1}>
        <CardHeader
          title="Subscriptions"
          description="Stored Stripe state — written only by the Stripe webhook, never from client input. Amounts come from the live Stripe price; the subscriptions table stores no amount."
        />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-small">
            <thead>
              <tr className="border-b border-black/10 text-caption uppercase tracking-wider text-ink-2">
                <th className="py-2 pr-3">Account</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Current period ends</th>
                <th className="py-2">Stripe customer</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((s) => (
                <tr key={s.user_id} className="border-b border-black/[0.06] text-ink-1">
                  <td className="py-2 pr-3">
                    <span className="block font-semibold">{s.display_name || s.email || UNKNOWN}</span>
                    {s.email && s.display_name && <span className="block text-ink-2">{s.email}</span>}
                  </td>
                  <td className="py-2 pr-3">{s.status}</td>
                  <td className="py-2 pr-3">{fmtDate(s.current_period_end)}</td>
                  <td className="py-2 font-mono text-small">{s.stripe_customer_id || UNKNOWN}</td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-ink-2">
                    No subscription records yet. A record is created when a learner checks out through Stripe.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export function AiCallsView({ data }) {
  if (!data) return <p className="text-body text-ink-2">Loading…</p>;
  const t = data.totals;
  return (
    <div className="space-y-3">
      <Card level={1} padding="sm">
        <p className="text-small text-ink-2">
          Cost history starts when call logging ships — there is no call history before then. Costs come from
          OpenAI list prices for the model used; a call with an unlisted model shows its cost as unknown.
        </p>
      </Card>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={`Calls · ${data.days} days`} value={t.calls} />
        <StatCard label="Prompt tokens" value={t.prompt_tokens.toLocaleString()} />
        <StatCard label="Completion tokens" value={t.completion_tokens.toLocaleString()} />
        <StatCard label="Cost" value={fmtUsd(t.cost_usd, 6)} sub="USD, at list prices" />
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card level={1}>
          <CardHeader title="Calls per day" />
          <div className="mt-4 space-y-1">
            {data.per_day.map((d) => (
              <div key={d.day} className="flex items-center justify-between gap-3 text-small text-ink-1">
                <span>{d.day}</span>
                <span>
                  {d.calls} call{d.calls === 1 ? '' : 's'} · {fmtUsd(d.cost_usd, 6)}
                </span>
              </div>
            ))}
            {data.per_day.length === 0 && <p className="text-small text-ink-2">No calls in this window.</p>}
          </div>
        </Card>
        <Card level={1}>
          <CardHeader title="Top users by cost" />
          <div className="mt-4 space-y-1">
            {data.per_user.map((u) => (
              <div key={u.user_id} className="flex items-center justify-between gap-3 text-small text-ink-1">
                <span className="min-w-0 truncate">{u.display_name || u.email || u.user_id}</span>
                <span>
                  {u.calls} call{u.calls === 1 ? '' : 's'} · {fmtUsd(u.cost_usd, 6)}
                </span>
              </div>
            ))}
            {data.per_user.length === 0 && <p className="text-small text-ink-2">No calls in this window.</p>}
          </div>
        </Card>
      </div>
      <Card level={1}>
        <CardHeader title="Recent calls" />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-small">
            <thead>
              <tr className="border-b border-black/10 text-caption uppercase tracking-wider text-ink-2">
                <th className="py-2 pr-3">When</th>
                <th className="py-2 pr-3">Account</th>
                <th className="py-2 pr-3">Mode / model</th>
                <th className="py-2 pr-3">Tokens</th>
                <th className="py-2">Cost</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map((c) => (
                <tr key={c.id} className="border-b border-black/[0.06] text-ink-1">
                  <td className="py-2 pr-3">{fmtDate(c.created_at)}</td>
                  <td className="py-2 pr-3">{c.display_name || c.email || c.user_id}</td>
                  <td className="py-2 pr-3">
                    {c.mode} · {c.model}
                    {c.cached && ' · cached'}
                    {c.error && ' · error'}
                  </td>
                  <td className="py-2 pr-3">
                    {c.prompt_tokens === null || c.completion_tokens === null
                      ? UNKNOWN
                      : `${c.prompt_tokens + c.completion_tokens} (${c.prompt_tokens} + ${c.completion_tokens})`}
                  </td>
                  <td className="py-2">{c.cost_usd === null ? UNKNOWN : fmtUsd(c.cost_usd, 6)}</td>
                </tr>
              ))}
              {data.recent.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-ink-2">
                    No calls in this window.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export function AddCustomerForm({ onSubmit, busy, error, success }) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  return (
    <Card level={1}>
      <CardHeader
        title="Add a customer"
        description="For someone who enrolled in person. Creates the account and grants paid access — they sign in later with Google or GitHub using this email. Access lasts until you revoke it."
      />
      <form
        className="mt-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ display_name: displayName.trim(), email: email.trim(), note: note.trim() });
        }}
      >
        <div>
          <label className="block text-small font-semibold text-ink-1" htmlFor="add-customer-name">
            Name
          </label>
          <input
            id="add-customer-name"
            type="text"
            required
            maxLength={120}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 h-11 w-full rounded-control border border-black/10 bg-white px-3 text-body text-ink-1 outline-none placeholder:text-ink-2 focus:border-violet-700/40"
            placeholder="Customer name"
          />
        </div>
        <div>
          <label className="block text-small font-semibold text-ink-1" htmlFor="add-customer-email">
            Email
          </label>
          <input
            id="add-customer-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 h-11 w-full rounded-control border border-black/10 bg-white px-3 text-body text-ink-1 outline-none placeholder:text-ink-2 focus:border-violet-700/40"
            placeholder="customer@example.com"
          />
        </div>
        <div>
          <label className="block text-small font-semibold text-ink-1" htmlFor="add-customer-note">
            Note (optional)
          </label>
          <input
            id="add-customer-note"
            type="text"
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1 h-11 w-full rounded-control border border-black/10 bg-white px-3 text-body text-ink-1 outline-none placeholder:text-ink-2 focus:border-violet-700/40"
            placeholder="e.g. Enrolled in person, Nov 16"
          />
        </div>
        {error && (
          <p role="alert" className="text-small font-semibold text-red-700">
            {error}
          </p>
        )}
        {success && (
          <p role="status" className="text-small font-semibold text-green-700">
            {success}
          </p>
        )}
        <Button type="submit" loading={busy}>
          Add customer + grant access
        </Button>
      </form>
    </Card>
  );
}

export function ReportView({ data, onDownloadCsv }) {
  if (!data) return <p className="text-body text-ink-2">Loading…</p>;
  return (
    <div className="space-y-3">
      <Card level={1} padding="sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-small text-ink-2">
            Report generated {fmtDate(data.generated_at)} · last {data.days} days · same figures as the tabs above.
          </p>
          <div className="flex gap-2 print:hidden">
            <Button variant="secondary" size="sm" onClick={() => window.print()}>
              Print
            </Button>
            <Button variant="secondary" size="sm" onClick={onDownloadCsv}>
              Download CSV
            </Button>
          </div>
        </div>
      </Card>
      <OverviewView data={data.overview} />
      <AccountsTable
        items={data.accounts.items}
        total={data.accounts.total}
        page={1}
        pageSize={Math.max(data.accounts.total, 1)}
        onPage={() => {}}
      />
      {data.accounts.truncated && (
        <p className="text-small text-ink-2">
          Report shows the first {data.accounts.items.length} accounts of {data.accounts.total}.
        </p>
      )}
      <SubscriptionsView data={data.subscriptions} />
      <AiCallsView data={data.ai_costs} />
    </div>
  );
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'ai', label: 'AI costs' },
  { id: 'report', label: 'Report' },
];

export default function Admin() {
  const [authed, setAuthed] = useState(null);
  const [tab, setTab] = useState('overview');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [overview, setOverview] = useState(null);
  const [accounts, setAccounts] = useState(null);
  const [accountsQ, setAccountsQ] = useState('');
  const [accountsPage, setAccountsPage] = useState(1);
  const [subscriptions, setSubscriptions] = useState(null);
  const [aiCalls, setAiCalls] = useState(null);
  const [report, setReport] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [addBusy, setAddBusy] = useState(false);
  const [addFormKey, setAddFormKey] = useState(0);
  const [rowBusy, setRowBusy] = useState(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    adminApi.status().then(
      (s) => setAuthed(s.authenticated),
      () => setAuthed(false),
    );
  }, []);

  const load = useCallback(
    async (which) => {
      setLoadError('');
      try {
        if (which === 'overview') setOverview(await adminApi.overview());
        if (which === 'accounts') setAccounts(await adminApi.accounts({ q: accountsQ, page: accountsPage }));
        if (which === 'subscriptions') setSubscriptions(await adminApi.subscriptions());
        if (which === 'ai') setAiCalls(await adminApi.aiCalls({ days: 30 }));
        if (which === 'report') setReport(await adminApi.report({ days: 30 }));
      } catch {
        setLoadError('Could not load admin data. The backend may be unreachable.');
      }
    },
    [accountsQ, accountsPage],
  );

  useEffect(() => {
    if (authed) load(tab);
  }, [authed, tab, load]);

  const handleLogin = async (password) => {
    setLoginError('');
    setLoginLoading(true);
    try {
      await adminApi.login(password);
      setAuthed(true);
    } catch {
      setLoginError('Invalid password.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await adminApi.logout();
    } catch {
      // already logged out server-side; still drop the local state
    }
    setAuthed(false);
    setOverview(null);
    setAccounts(null);
    setSubscriptions(null);
    setAiCalls(null);
    setReport(null);
  };

  const handleAddCustomer = async ({ display_name, email, note }) => {
    setAddError('');
    setAddSuccess('');
    setAddBusy(true);
    try {
      const res = await adminApi.addAccount({ display_name, email, note });
      setAddSuccess(`Added ${res.user.display_name || res.user.email} — paid access granted.`);
      setAddFormKey((k) => k + 1);
      load('accounts');
      load('overview');
    } catch (e) {
      setAddError(
        e.status === 409
          ? 'An account with this email already exists.'
          : e.detail || 'Could not add this customer.',
      );
    } finally {
      setAddBusy(false);
    }
  };

  const handleGrant = async (userId, note) => {
    setRowBusy(userId);
    try {
      await adminApi.grantAccess(userId, note);
      load('accounts');
      load('overview');
    } catch {
      setLoadError('Could not grant access. Try again.');
    } finally {
      setRowBusy(null);
    }
  };

  const handleRevoke = async (userId) => {
    setRowBusy(userId);
    try {
      await adminApi.revokeAccess(userId, '');
      load('accounts');
      load('overview');
    } catch {
      setLoadError('Could not revoke access. Try again.');
    } finally {
      setRowBusy(null);
    }
  };

  // Edit/delete intentionally do not catch: the row's inline form/confirm
  // shows the server's message (e.g. the 409 when the email is taken or the
  // account still has a live Stripe subscription) and stays open.
  const handleEdit = async (userId, values) => {
    setRowBusy(userId);
    try {
      await adminApi.updateAccount(userId, values);
      load('accounts');
      load('overview');
    } finally {
      setRowBusy(null);
    }
  };

  const handleDelete = async (userId) => {
    setRowBusy(userId);
    try {
      await adminApi.deleteAccount(userId);
      load('accounts');
      load('overview');
    } finally {
      setRowBusy(null);
    }
  };

  const handleDownloadCsv = () => {
    // Same-origin anchor download: the admin session cookie rides along,
    // and Content-Disposition makes it a file download, not a navigation.
    const a = document.createElement('a');
    a.href = adminApi.reportCsvUrl({ days: 30 });
    a.download = '';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  if (authed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-ink-3 border-t-ink-1" />
      </div>
    );
  }
  if (!authed) {
    return <AdminLoginForm onSubmit={handleLogin} error={loginError} loading={loginLoading} />;
  }

  return (
    <Shell
      action={
        <span className="print:hidden">
          <Button variant="secondary" size="sm" icon={LogOut} onClick={handleLogout}>
            Log out
          </Button>
        </span>
      }
    >
      <div className="flex flex-wrap gap-2 print:hidden" role="tablist" aria-label="Admin sections">
        {TABS.map((t) => (
          <Button
            key={t.id}
            variant={tab === t.id ? 'primary' : 'secondary'}
            size="sm"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>
      {loadError && (
        <p role="alert" className="mt-4 text-small font-semibold text-red-700">
          {loadError}
        </p>
      )}
      <div className="mt-4">
        {tab === 'overview' && <OverviewView data={overview} />}
        {tab === 'accounts' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative max-w-sm flex-1">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-2" aria-hidden="true" />
                <input
                  type="search"
                  value={accountsQ}
                  onChange={(e) => {
                    setAccountsQ(e.target.value);
                    setAccountsPage(1);
                  }}
                  placeholder="Search name or email"
                  aria-label="Search accounts by name or email"
                  className="h-11 w-full rounded-control border border-black/10 bg-white pl-9 pr-3 text-body text-ink-1 outline-none placeholder:text-ink-2 focus:border-violet-700/40"
                />
              </div>
              <Button variant="secondary" size="sm" onClick={() => setShowAddForm((v) => !v)}>
                {showAddForm ? 'Close add-customer form' : 'Add customer'}
              </Button>
            </div>
            {showAddForm && (
              <AddCustomerForm
                key={addFormKey}
                onSubmit={handleAddCustomer}
                busy={addBusy}
                error={addError}
                success={addSuccess}
              />
            )}
            <AccountsTable
              items={accounts?.items || []}
              total={accounts?.total || 0}
              page={accounts?.page || 1}
              pageSize={accounts?.page_size || 25}
              onPage={setAccountsPage}
              onGrant={handleGrant}
              onRevoke={handleRevoke}
              onEdit={handleEdit}
              onDelete={handleDelete}
              busyId={rowBusy}
            />
          </div>
        )}
        {tab === 'subscriptions' && <SubscriptionsView data={subscriptions} />}
        {tab === 'ai' && <AiCallsView data={aiCalls} />}
        {tab === 'report' && <ReportView data={report} onDownloadCsv={handleDownloadCsv} />}
      </div>
    </Shell>
  );
}
