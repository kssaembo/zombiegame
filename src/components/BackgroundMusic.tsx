import { useEffect, useRef, useState } from 'react';
import { Music2, Pause, Play } from 'lucide-react';
import type { GameState } from '../types';
import gameMusic from '../assets/audio/bgm_game_suspense.mp3';
import resultMusic from '../assets/audio/bgm_results_resolution.mp3';

export function BackgroundMusic({ view }: { view: GameState }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [volume, setVolume] = useState(0.2);
  const [userPaused, setUserPaused] = useState(false);
  const [status, setStatus] = useState<'paused' | 'playing' | 'blocked' | 'error'>('paused');
  const src = view === 'GAME' ? gameMusic : view === 'RESULTS' ? resultMusic : undefined;

  useEffect(() => setUserPaused(false), [view]);
  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume, src]);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !src) return;
    let cancelled = false;
    if (!userPaused) {
      void audio.play().catch(error => {
        if (!cancelled) setStatus(error?.name === 'NotAllowedError' ? 'blocked' : 'error');
      });
    } else audio.pause();
    return () => { cancelled = true; audio.pause(); };
  }, [src, userPaused]);

  if (!src) return null;

  const paused = userPaused || status !== 'playing';
  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused && !userPaused) { setUserPaused(true); return; }
    setUserPaused(false);
    void audio.play().catch(error => setStatus(error?.name === 'NotAllowedError' ? 'blocked' : 'error'));
  };

  return (
    <section aria-label="배경 음악 설정" className={`fixed right-2 z-[90] flex max-w-[calc(100vw-1rem)] items-center gap-2 rounded-xl border border-white/15 bg-slate-950/90 px-2.5 py-2 text-xs shadow-2xl backdrop-blur-md sm:right-4 ${view === 'GAME' ? 'bottom-40 lg:bottom-4' : 'bottom-4'}`}>
      <audio ref={audioRef} src={src} loop preload="auto" onPlaying={() => setStatus('playing')} onPause={() => setStatus(current => current === 'blocked' || current === 'error' ? current : 'paused')} onError={() => setStatus('error')} />
      <button type="button" data-sound="select" aria-label={paused ? 'BGM 재생' : 'BGM 일시정지'} onClick={togglePlayback} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-600 text-white hover:bg-purple-500">
        {paused ? <Play className="h-4 w-4 fill-current" /> : <Pause className="h-4 w-4 fill-current" />}
      </button>
      <span className="flex shrink-0 items-center gap-1.5 font-semibold text-slate-200"><Music2 className="h-3.5 w-3.5" aria-hidden="true" />BGM</span>
      <label className="sr-only" htmlFor="bgm-volume">BGM 음량</label>
      <input id="bgm-volume" aria-label="BGM 음량" type="range" min="0" max="100" step="5" value={Math.round(volume * 100)} onInput={event => setVolume(Number(event.currentTarget.value) / 100)} onChange={event => setVolume(Number(event.target.value) / 100)} className="w-20 accent-purple-400 sm:w-24" />
      <span className="w-8 shrink-0 text-right tabular-nums text-slate-400">{Math.round(volume * 100)}%</span>
      <span role="status" className="sr-only">{status === 'blocked' ? '자동 재생이 차단되었습니다. 재생 버튼을 눌러주세요.' : status === 'error' ? 'BGM을 불러오지 못했습니다.' : status === 'playing' ? 'BGM 재생 중' : 'BGM 일시정지'}</span>
    </section>
  );
}
