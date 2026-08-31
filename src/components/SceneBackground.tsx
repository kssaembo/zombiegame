import type { GameState } from '../types';
import lobby from '../assets/images/bg_lobby_lab.webp';
import briefing from '../assets/images/bg_briefing_lab.webp';
import human from '../assets/images/bg_result_human.webp';
import infected from '../assets/images/bg_result_infected.webp';

export function SceneBackground({ view, humanSurvived }: { view: GameState; humanSurvived: boolean }) {
  // During play the background is neutral; it never reveals the hidden team state.
  const src = view === 'START' ? lobby : view === 'RESULTS' ? (humanSurvived ? human : infected) : briefing;
  return (
    <div aria-hidden="true" className="fixed inset-0 overflow-hidden pointer-events-none">
      <img key={src} src={src} alt="" className="h-full w-full object-cover object-center" />
      <div className={`absolute inset-0 ${view === 'GAME' ? 'bg-slate-950/80' : view === 'START' ? 'bg-slate-950/35' : 'bg-slate-950/55'}`} />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/20" />
    </div>
  );
}
