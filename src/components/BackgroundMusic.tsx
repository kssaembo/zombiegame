import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Music2 } from 'lucide-react';
import type { GameState } from '../types';
import gameMusic from '../assets/audio/bgm_game_suspense.mp3';
import resultMusic from '../assets/audio/bgm_results_resolution.mp3';

export function BackgroundMusic({ view, isTimerRunning }: { view: GameState; isTimerRunning: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.2);
  const [status, setStatus] = useState<'paused' | 'playing' | 'blocked' | 'error'>('paused');
  const src = view === 'GAME' ? gameMusic : view === 'RESULTS' ? resultMusic : undefined;
  const shouldPlay = !muted && (view === 'RESULTS' || (view === 'GAME' && isTimerRunning));

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume, src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !src) return;
    let cancelled = false;
    setStatus('paused');
    if (shouldPlay) {
      void audio.play().catch(error => {
        if (!cancelled) setStatus(error?.name === 'NotAllowedError' ? 'blocked' : 'error');
      });
    } else audio.pause();
    // Pause on route changes/unmount; play() rejections from an old track are ignored.
    return () => { cancelled = true; audio.pause(); };
  }, [src, shouldPlay]);

  const retryPlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;
    // Call play inside the click itself for browsers that require user activation.
    void audio.play().catch(error => {
      if (audioRef.current === audio) setStatus(error?.name === 'NotAllowedError' ? 'blocked' : 'error');
    });
  };

  if (!src) return null; // No lobby/setup BGM and no request for a lobby audio file.

  return (
    <section aria-label="배경 음악 설정" className="mx-auto mb-5 flex max-w-4xl flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-2xl border border-white/15 bg-slate-950/85 px-4 py-3 text-sm shadow-lg backdrop-blur-md">
      <audio ref={audioRef} src={src} loop preload="none" onPlaying={() => setStatus('playing')} onPause={() => setStatus(current => current === 'error' || current === 'blocked' ? current : 'paused')} onError={() => setStatus('error')} />
      <span className="flex items-center gap-2 text-slate-300"><Music2 className="h-4 w-4" aria-hidden="true" />{view === 'RESULTS' ? '결과 BGM' : '게임 BGM'}</span>
      <button type="button" aria-label={muted ? 'BGM 음소거 해제' : 'BGM 음소거'} aria-pressed={muted} onClick={() => setMuted(value => !value)} className="flex min-h-10 items-center gap-2 rounded-lg border border-white/15 px-3 text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-purple-400">
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}{muted ? '음소거 해제' : '음소거'}
      </button>
      <label className="flex items-center gap-2 text-slate-300">BGM 음량
        <select value={Math.round(volume * 100)} onChange={event => setVolume(Number(event.target.value) / 100)} className="min-h-10 rounded-lg border border-white/20 bg-slate-900 px-2 text-white">
          {[0, 10, 20, 30, 40, 50, 75, 100].map(value => <option key={value} value={value}>{value}%</option>)}
        </select>
      </label>
      <span role="status" className="text-xs text-slate-400">{muted ? '음소거' : status === 'blocked' ? '브라우저에서 자동 재생을 차단했습니다.' : status === 'error' ? '음악을 불러오지 못했습니다. 게임은 계속할 수 있습니다.' : status === 'playing' ? '재생 중' : shouldPlay ? '음악 준비 중' : '타이머와 함께 일시정지'}</span>
      {(status === 'blocked' || status === 'error') && shouldPlay && <button type="button" className="min-h-10 rounded-lg bg-purple-600 px-3 text-white" onClick={retryPlayback}>BGM 다시 재생</button>}
    </section>
  );
}
