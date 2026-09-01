import { playSound, type SoundType } from './sound';

export type ButtonSound = Exclude<SoundType, 'type' | 'siren'>;

export function classifyButtonSound(label: string, configured?: string): ButtonSound {
  if (configured === 'select' || configured === 'confirm' || configured === 'alert' || configured === 'next') return configured;
  if (/강제 종료|전체 삭제|삭제/.test(label)) return 'alert';
  if (/다음|이전|닫기|결과 보기|돌아가기/.test(label)) return 'next';
  if (/시작|확인|사용|터치|치료제|추가|이어하기|다운로드|재생/.test(label)) return 'confirm';
  return 'select';
}

export function installButtonSounds(root: Document = document) {
  const listener = (event: MouseEvent) => {
    const target = event.target instanceof Element ? event.target.closest('button') : null;
    if (!(target instanceof HTMLButtonElement) || target.disabled) return;
    playSound(classifyButtonSound(target.innerText.trim(), target.dataset.sound));
  };
  root.addEventListener('click', listener);
  return () => root.removeEventListener('click', listener);
}
