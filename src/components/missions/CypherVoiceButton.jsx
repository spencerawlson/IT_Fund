import React from 'react';
import { Volume2, VolumeX, Square } from 'lucide-react';
import { useCypherVoice } from '@/api/voice';
import { logCypherEvent } from '@/api/analytics';
import { pillClass, TutorText } from '@/components/academy/tutor/TutorAssist';

/**
 * A "Listen" control for a block of text (mission briefing, debrief):
 * Cipher speaks it through the voice service while his 3D model talks,
 * and the text shows as subtitles while it plays. Mute + volume persist.
 * When voice is not configured (Spencer hasn't supplied the key + voice
 * ID yet) the button still works as a text-only read-along: Cipher talks
 * silently and the subtitles show.
 *
 * `voice` is a useCypherVoice instance (shared by the page so two clips
 * never overlap); when omitted the button creates its own. `voiceRef` is
 * the shared mutable ref { talking, level } the SOC scene (or the lesson
 * panel) reads every frame. `eventContext` ({mission_id, lesson_id}) is
 * attached to the voice_played / voice_fallback events. `onPlayingChange`
 * is called with true/false whenever playback starts/stops, so the page
 * can react (the mission camera focuses on the speaker while they talk).
 * `controlsOnly` renders just the sound controls (mute + volume) — no
 * Listen/Stop button, no subtitle, no error — for when the briefing
 * plays itself (the mission opening auto-plays it on entry, so a Listen
 * button and an explanatory card are redundant; the sound controls stay
 * reachable and unobtrusive). onPlayingChange still fires, so the page
 * still tracks playback.
 */
export default function CypherVoiceButton({ text, label = 'Listen', voice, voiceRef, eventContext = {}, onPlayingChange, controlsOnly = false }) {
  const ownVoice = useCypherVoice(voiceRef);
  const { play, stop, playing, error, subtitle, muted, setMuted, volume, setVolume } = voice || ownVoice;

  React.useEffect(() => {
    if (onPlayingChange) onPlayingChange(playing);
  }, [playing, onPlayingChange]);

  const listen = async () => {
    const spoken = await play(text);
    if (spoken) {
      logCypherEvent({ event: 'voice_played', ...eventContext });
    } else if (error) {
      logCypherEvent({ event: 'voice_fallback', ...eventContext });
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {!controlsOnly && (playing ? (
          <button type="button" onClick={stop} className={pillClass} aria-label="Stop Cypher speaking">
            <Square size={13} className="fill-current" /> Stop
          </button>
        ) : (
          <button type="button" onClick={listen} className={pillClass} disabled={!text}>
            <Volume2 size={15} className="text-action" /> {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setMuted(!muted)}
          className={pillClass}
          aria-label={muted ? 'Unmute Cipher’s voice' : 'Mute Cipher’s voice'}
          aria-pressed={muted}
        >
          {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          {muted ? 'Muted' : 'Sound on'}
        </button>
        <label className="flex items-center gap-1.5 text-small text-ink-2">
          Volume
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            aria-label="Cipher voice volume"
            className="w-24 accent-violet-700"
          />
        </label>
      </div>
      {!controlsOnly && error && <p className="mt-2 text-small text-danger">{error}</p>}
      {!controlsOnly && subtitle && (
        <div className="mt-3 rounded-control border border-violet-700/20 bg-violet-50 p-3 text-sm leading-relaxed text-ink-1" aria-live="polite">
          <span className="mr-1.5 font-bold text-action-hover">Cipher:</span>
          <TutorText text={subtitle} />
        </div>
      )}
    </div>
  );
}
