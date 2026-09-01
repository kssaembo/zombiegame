/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { 
  Play, 
  Settings, 
  Users, 
  Skull, 
  Timer, 
  Zap, 
  Heart, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Plus,
  X,
  Download,
  FileSpreadsheet,
  Youtube
} from 'lucide-react';
import { Student, GameState, GameConfig, GameLog } from './types';
import { IntroStoryModal } from './components/IntroStoryModal';
import { isValidRoundTime, resolveTouch, resolveCure, resolveRoundEnd, logRows, statusOf, type LogEntry } from './game/rules';
import { loadSave, writeSave, clearSave, type SavedGame } from './game/storage';
import { createId } from './game/id';
import { SceneBackground } from './components/SceneBackground';
import { BackgroundMusic } from './components/BackgroundMusic';
import { installButtonSounds, type ButtonSound } from './audio/buttonSound';

// --- Utility Components ---

const Card = React.memo(({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm ${className}`}>
    {children}
  </div>
));

const Button = React.memo(({ 
  children, 
  onClick, 
  variant = 'primary', 
  disabled = false, 
  className = "",
  size = 'md',
  sound,
}: { 
  children: React.ReactNode, 
  onClick?: () => void, 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'neon',
  disabled?: boolean,
  className?: string,
  size?: 'sm' | 'md' | 'lg',
  sound?: ButtonSound,
}) => {
  const variants = {
    primary: 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20',
    secondary: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700',
    danger: 'bg-red-600 hover:bg-red-500 text-white shadow-red-500/20',
    ghost: 'bg-transparent hover:bg-zinc-800 text-zinc-400',
    neon: 'bg-green-500 hover:bg-green-400 text-black font-bold shadow-green-500/40'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg font-bold'
  };

  return (
    <button
      data-sound={sound ?? (variant === 'danger' ? 'alert' : variant === 'neon' ? 'confirm' : variant === 'primary' ? 'confirm' : 'select')}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${variants[variant]} 
        ${sizes[size]}
        rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
        flex items-center justify-center gap-2 shadow-lg
        ${className}
      `}
    >
      {children}
    </button>
  );
});

// --- Teacher Page Component (Memoized to prevent flickering) ---

const TeacherPage = React.memo(({ 
  show, 
  onClose, 
  students, 
  logs,
  onExport
}: { 
  show: boolean; 
  onClose: () => void; 
  students: Student[]; 
  logs: GameLog[];
  onExport: () => void;
}) => {
  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] p-8 overflow-y-auto"
      >
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <h2 className="text-3xl font-black text-purple-500">교사 전용 관리 도구</h2>
              <Button variant="secondary" size="sm" onClick={onExport}>
                <FileSpreadsheet className="w-4 h-4" /> 결과 엑셀 다운로드
              </Button>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-8 h-8" />
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Student Status */}
            <div className="lg:col-span-2">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-500" /> 학생 현황
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {students.map(s => (
                  <div key={s.id} className={`p-4 rounded-xl border-2 ${s.isZombie ? 'border-green-500/50 bg-green-500/5' : 'border-zinc-800 bg-zinc-900'}`}>
                    <p className={`font-bold text-lg ${s.isZombie ? 'text-green-500' : 'text-white'}`}>{s.name}</p>
                    <p className="text-xs text-zinc-500">승점: {s.points}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {s.isZombie && <span className="text-[8px] bg-green-500 text-black px-1 rounded uppercase font-bold">감염자</span>}
                      {s.touchedThisRound && <span className="text-[8px] bg-blue-500 text-white px-1 rounded uppercase font-bold">Touched</span>}
                      {s.infectedThisRound && <span className="text-[8px] bg-red-500 text-white px-1 rounded uppercase font-bold">Infected</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Game Logs */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 h-fit max-h-[70vh] flex flex-col">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Timer className="w-5 h-5 text-purple-500" /> 실시간 로그
              </h3>
              <div className="overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {logs.length === 0 ? (
                  <p className="text-zinc-600 text-center py-8 italic">기록된 로그가 없습니다.</p>
                ) : (
                  logs.map(log => (
                    <div key={log.id} className="text-sm border-l-2 border-zinc-800 pl-3 py-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-[10px] font-bold px-1 rounded ${
                          log.type === 'TOUCH' ? 'bg-blue-500/20 text-blue-400' :
                          log.type === 'INFECTION' ? 'bg-red-500/20 text-red-400' :
                          log.type === 'CURE' ? 'bg-green-500/20 text-green-400' :
                          'bg-purple-500/20 text-purple-400'
                        }`}>
                          {log.type}
                        </span>
                        <span className="text-[10px] text-zinc-600">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-zinc-300 leading-tight">
                        <span className="text-zinc-500 mr-1">R{log.round}</span>
                        {log.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

// --- View Components (Moved outside App to prevent flickering) ---

const StartView = React.memo(({ onStart }: { onStart: () => void }) => {
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: "1장. 게임 개요 및 진영",
      icon: <Users className="w-12 h-12 text-purple-400" />,
      content: (
        <div className="space-y-4">
          <p className="text-zinc-300 leading-relaxed text-sm md:text-base">
            게임은 비밀리에 나뉜 두 <span className="font-bold">진영</span>(비감염자와 감염자) 사이의 고도의 생존 예측 대결입니다.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
              <span className="text-purple-400 text-xs font-bold uppercase tracking-wider block">비감염자 진영</span>
              <p className="text-zinc-300 text-xs leading-relaxed">감염자의 감염을 피하고, 치료제를 사용하여 마지막까지 비감염자로서 살아남으세요.</p>
            </div>
            <div className="p-4 rounded-xl bg-green-950/20 border border-green-900/40 space-y-2">
              <span className="text-green-400 text-xs font-bold uppercase tracking-wider block">감염자 진영</span>
              <p className="text-green-300 text-xs leading-relaxed font-bold">감염자의 목표: 모든 비감염자를 감염시키세요.</p>
            </div>
          </div>
          <p className="text-zinc-500 text-[11px] leading-relaxed mt-4">
            ※ 시작 라운드 시 일부 학생이 무작위로 '최초 감염자'로 선발되며 선발 정보는 교사 화면에서 철저히 관리됩니다.
          </p>
        </div>
      )
    },
    {
      title: "2장. 터치 규칙",
      icon: <Zap className="w-12 h-12 text-yellow-400" />,
      content: (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/30 space-y-2">
            <span className="text-purple-300 text-xs font-black block">💡 라운드 핵심 목표</span>
            <p className="text-zinc-200 text-sm leading-relaxed font-bold">
              목표: 모든 플레이어는 매 라운드마다 1번 이상 터치를 해야 합니다.<br />터치를 하지 못한 플레이어는 라운드 종료 후 감염자가 됩니다.
            </p>
          </div>
          
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
            <h4 className="text-yellow-400 font-bold text-xs md:text-sm">⚠️ 중요 (중복 방지 규칙)</h4>
            <p className="text-zinc-300 text-xs leading-relaxed">
              이미 한 번 터치한 두 플레이어는 전체 게임 내에서 다시 터치할 수 없습니다.<br />터치를 시도하면 시스템에서 사전 중복 경고를 표시합니다.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "3장. 치료제 사용",
      icon: <Heart className="w-12 h-12 text-red-500" />,
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
              <h5 className="text-red-400 text-xs font-bold mb-1">🧪 생존 치료</h5>
              <p className="text-zinc-300 text-[13px] leading-relaxed">
                해당 라운드에서 감염된 학생은 치료제를 사용하여 다시 비감염자가 될 수 있습니다.
              </p>
            </div>
            <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
              <h5 className="text-blue-400 text-xs font-bold mb-1">🎒 치료제 한도</h5>
              <p className="text-zinc-300 text-[13px] leading-relaxed">
                치료제는 기본적으로 모든 플레이어에게 1개씩만 지급됩니다. 추가 구매는 선생님께 문의해주세요.
              </p>
            </div>
            <div className="p-3 bg-red-950/20 rounded-lg border border-red-900/40">
              <h5 className="text-red-300 text-xs font-bold mb-1">⚠️ 최초 감염자 치료 불가</h5>
              <p className="text-zinc-300 text-[13px] leading-relaxed">
                최초 감염자는 치료제를 사용해도 치료되지 않습니다.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "4장. 추가 규칙",
      icon: <AlertTriangle className="w-12 h-12 text-orange-400" />,
      content: (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-orange-950/20 border border-orange-900/30 space-y-2">
            <h4 className="text-orange-400 font-bold text-sm">무활동 패널티</h4>
            <p className="text-zinc-200 text-xs leading-relaxed font-semibold">
              매 라운드 제한시간 내에 아무하고도 접촉(터치)하지 않은 비감염자 플레이어는<br />라운드 종료 시 감염되어 감염자로 변합니다.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-orange-950/20 border border-orange-900/30 space-y-2">
            <h4 className="text-orange-400 font-bold text-sm">치료제 사용 시 승점 유지 정책</h4>
            <p className="text-zinc-200 text-xs leading-relaxed font-semibold">
              감염자가 되었다가 치료제를 사용해 비감염자로 되돌아 왔을 때<br />기존 비감염자일 때 가지고 있던 승점은 그대로 유지됩니다.
            </p>
          </div>
          <p className="text-zinc-400 text-xs leading-relaxed">
            ※ 해당 라운드 동안 한 번도 터치를 안 한 학생은 라운드가 끝나면 자동으로 감염이 됩니다.
          </p>
        </div>
      )
    },
    {
      title: "5장. 승리 조건",
      icon: <Skull className="w-12 h-12 text-green-500" />,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-purple-950/20 border border-purple-900/40 rounded-xl space-y-1">
              <span className="text-purple-400 text-xs font-bold">비감염자 진영 승리 조건</span>
              <p className="text-zinc-300 text-xs leading-relaxed">
                최종 라운드가 마무리되는 시점에 생존한 비감염자 진영의 플레이어가 단 한 명이라도 존재한다면 승리합니다.
              </p>
            </div>
            
            <div className="p-3 bg-green-950/20 border border-green-900/40 rounded-xl space-y-1">
              <span className="text-green-400 text-xs font-bold">감염자 진영 승리 조건</span>
              <p className="text-zinc-300 text-xs leading-relaxed">
                교실 내 모든 플레이어가 감염자가 되면 감염자 진영이 승리합니다.
              </p>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-purple-950/30 border border-purple-800/30 rounded-xl text-center">
            <p className="text-purple-300 text-[12px] font-bold leading-relaxed">
              유튜브에서 🎬 '지니어스 게임-좀비게임'을 검색해 보시면<br />영상 형태의 게임 소개 영상을 보실 수 있습니다.
            </p>
          </div>
        </div>
      )
    }
  ];

  const handlePrev = () => setCurrentSlide((prev) => Math.max(0, prev - 1));
  const handleNext = () => {
    if (currentSlide === slides.length - 1) {
      setIsGuideOpen(false);
      setCurrentSlide(0);
    } else {
      setCurrentSlide((prev) => prev + 1);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[80vh] text-center"
    >
      <Skull className="w-24 h-24 text-green-500 mb-6 animate-pulse" />
      <h1 className="text-6xl font-black mb-4 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-green-500">
        VIRUS GAME
      </h1>
      
      {/* 바뀐 메인 설명 태그라인 */}
      <div className="flex flex-wrap justify-center gap-2 mb-12 max-w-lg">
        <span className="px-3 py-1 bg-purple-950/40 border border-purple-800/50 text-purple-400 text-xs md:text-sm font-semibold rounded-full shadow-lg">
          #지니어스 한 학급 놀이
        </span>
        <span className="px-3 py-1 bg-green-950/40 border border-green-800/50 text-green-400 text-xs md:text-sm font-semibold rounded-full shadow-lg">
          #과학 감염병 단원
        </span>
        <span className="px-3 py-1 bg-zinc-900 border border-zinc-700/50 text-zinc-300 text-xs md:text-sm font-semibold rounded-full shadow-lg">
          #바이러스
        </span>
        <span className="px-3 py-1 bg-zinc-900 border border-zinc-700/50 text-zinc-300 text-xs md:text-sm font-semibold rounded-full shadow-lg">
          #세균
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6 mt-4">
        <Button size="lg" onClick={onStart} variant="neon" className="w-56 h-14 text-lg shadow-lg">
          게임 시작하기 <ChevronRight className="w-6 h-6 ml-1" />
        </Button>
        <div className="relative">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-indigo-500 text-[10px] text-white font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-bounce shadow-lg shadow-purple-500/30 z-10 select-none whitespace-nowrap">
            📢 필독! 게임 설명
          </span>
          <Button 
            size="lg" 
            onClick={() => {
              setCurrentSlide(0);
              setIsGuideOpen(true);
            }} 
            variant="secondary" 
            className="w-56 h-14 text-lg border-purple-500/40 text-purple-300 bg-purple-950/10 hover:bg-purple-950/20 hover:border-purple-400 hover:text-white shadow-[0_0_15px_rgba(168,85,247,0.15)] hover:shadow-[0_0_25px_rgba(168,85,247,0.35)] transition-all duration-300"
          >
            <BookOpen className="w-5 h-5 mr-2 text-purple-400" /> 사용 설명서
          </Button>
        </div>
        <div>
          <a
            href="https://youtu.be/ZqVtWvMgoQI"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-5 h-14 rounded-2xl border border-red-500/40 text-red-400 bg-red-950/10 hover:bg-red-950/20 hover:border-red-400 hover:text-white shadow-[0_0_15px_rgba(239,68,68,0.15)] hover:shadow-[0_0_25px_rgba(239,68,68,0.35)] transition-all duration-300 transform hover:scale-105"
            title="소개 영상 보기"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-500 shadow-md shadow-red-500/30">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-white fill-current">
                <polygon points="8 5 19 12 8 19" />
              </svg>
            </div>
            <span className="text-lg font-bold">소개 영상</span>
          </a>
        </div>
      </div>

      {/* 가이드 대형 팝업 모달 */}
      <AnimatePresence>
        {isGuideOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* 모달 헤더 */}
              <div className="p-6 border-b border-zinc-850 flex items-center justify-between bg-black/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-950/50 border border-purple-800/30 rounded-xl">
                    <BookOpen className="w-6 h-6 text-purple-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight">지니어스 바이러스 게임 사용 설명서</h2>
                </div>
                <button 
                  onClick={() => setIsGuideOpen(false)}
                  className="p-2 rounded-full hover:bg-zinc-800/50 text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* 모달 본문 (슬라이드 설명 영역) */}
              <div className="p-6 md:p-8 flex-1 overflow-y-auto flex flex-col justify-between min-h-[300px]">
                <div className="space-y-6">
                  {/* 슬라이드 아이콘 및 제목 */}
                  <div className="flex items-center gap-4">
                    {slides[currentSlide].icon}
                    <h3 className="text-2xl font-black text-white tracking-tight">
                      {slides[currentSlide].title}
                    </h3>
                  </div>

                  {/* 슬라이드 세부 콘텐츠 */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentSlide}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="min-h-[160px]"
                    >
                      {slides[currentSlide].content}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* 슬라이드 점(인디케이터) 및 이동 바 */}
                <div className="mt-8 flex items-center justify-between border-t border-zinc-900 pt-6">
                  <div className="flex gap-2">
                    {slides.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentSlide(idx)}
                        className={`h-2.5 rounded-full transition-all duration-300 ${idx === currentSlide ? 'w-8 bg-purple-500' : 'w-2.5 bg-zinc-800'}`}
                      />
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handlePrev}
                      disabled={currentSlide === 0}
                      className={`px-4 ${currentSlide === 0 ? 'opacity-30 pointer-events-none' : ''}`}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" /> 이전
                    </Button>
                    <Button
                      size="sm"
                      variant={currentSlide === slides.length - 1 ? "neon" : "primary"}
                      onClick={handleNext}
                      className="px-6 min-w-[80px]"
                    >
                      {currentSlide === slides.length - 1 ? "완료" : "다음"} <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

const SetupConfigView = React.memo(({ 
  config, 
  onNext,
  onBack
}: { 
  config: GameConfig; 
  onNext: (newConfig: GameConfig) => void;
  onBack: () => void;
}) => {
  const [localRoundTime, setLocalRoundTime] = useState(String(config.roundTime));
  const validTime = isValidRoundTime(Number(localRoundTime));

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto py-12"
    >
      <Card>
        <div className="flex items-center gap-3 mb-8">
          <Settings className="text-purple-500" />
          <h2 className="text-2xl font-bold">기본 설정</h2>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">라운드당 제한 시간 (초)</label>
            <input 
              type="number" min="1" step="1" aria-label="라운드당 제한 시간 (초)" aria-invalid={!validTime} aria-describedby="round-time-error"
              value={localRoundTime}
              onChange={(e) => setLocalRoundTime(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {!validTime && <p id="round-time-error" role="alert" className="mt-2 text-red-400 text-sm">제한 시간은 1초 이상의 정수로 입력해주세요.</p>}
            <div className="mt-2.5 p-3.5 bg-purple-950/30 border border-purple-500/30 rounded-xl text-xs md:text-sm text-purple-200 leading-relaxed space-y-1">
              <p className="flex items-start gap-1.5">
                <span className="text-purple-400 font-bold shrink-0">💡</span>
                <span>라운드당 제한시간은 플레이어 수에 따라 달라지지만 7~8분을 추천드립니다.</span>
              </p>
              <p className="flex items-start gap-1.5 text-zinc-300">
                <span className="text-purple-400 font-bold shrink-0">💡</span>
                <span>게임 중간 타이머를 멈추거나 라운드를 강제 종료할 수 있기 때문에 시간 설정은 크게 중요하지 않습니다.</span>
              </p>
            </div>
          </div>
          <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
            <p className="text-sm text-zinc-400">총 라운드는 <span className="text-purple-500 font-bold">3라운드</span>로 고정되어 있습니다.</p>
          </div>
        </div>

        <div className="mt-12 flex justify-between items-center">
          <Button onClick={onBack} variant="secondary">
            <ChevronLeft className="w-5 h-5 mr-1" /> 이전
          </Button>
          <Button disabled={!validTime} onClick={() => onNext({ roundTime: Number(localRoundTime), totalRounds: 3 })}>
            다음 단계 <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </Card>
    </motion.div>
  );
});

const SetupStudentsView = React.memo(({ 
  students, 
  onAddStudents, 
  onRemoveStudent, 
  onClearAll, 
  onNext,
  onBack
}: { 
  students: Student[]; 
  onAddStudents: (names: string[]) => void; 
  onRemoveStudent: (id: string) => void; 
  onClearAll: () => void; 
  onNext: () => void; 
  onBack: () => void;
}) => {
  const [bulkInput, setBulkInput] = useState('');
  
  const handleBulkAdd = () => {
    const names = bulkInput.split('\n').map(n => n.trim()).filter(n => n !== '');
    if (names.length === 0) return;
    onAddStudents(names);
    setBulkInput('');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto py-12"
    >
      <Card>
        <div className="flex items-center gap-3 mb-8">
          <Users className="text-purple-500" />
          <h2 className="text-2xl font-bold">학생 명단 입력</h2>
        </div>

        <div className="space-y-4 mb-8">
          <label className="block text-sm font-medium text-zinc-400">
            학생 이름을 한 줄에 한 명씩 입력하세요 (엔터로 구분)
          </label>

          <div className="p-3.5 bg-amber-950/40 border border-amber-500/40 rounded-xl text-xs md:text-sm text-amber-200 font-medium leading-relaxed flex items-start gap-2 shadow-sm">
            <span className="text-amber-400 font-bold shrink-0">📌 안내:</span>
            <span>학생 명부 한글 파일에서 학생 이름 셀만 블록 지정하신 후 합치기를 합니다. 이후 학생 이름 전체를 복사해 붙여넣기를 하시면 편리합니다.</span>
          </div>

          <textarea 
            value={bulkInput}
            onChange={(e) => setBulkInput(e.target.value)}
            placeholder="홍길동&#10;김철수&#10;이영희"
            className="w-full h-48 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 font-sans resize-none"
          />
          <Button onClick={handleBulkAdd} variant="secondary" className="w-full">
            <Plus className="w-5 h-5" /> 학생 추가하기
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-[300px] overflow-y-auto pr-2">
          <AnimatePresence initial={false}>
            {students.map((s) => (
              <motion.div 
                key={s.id}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="bg-zinc-800/50 border border-zinc-700 p-3 rounded-xl flex items-center justify-between group"
              >
                <span className="font-medium truncate mr-2">{s.name}</span>
                <button onClick={() => onRemoveStudent(s.id)} className="text-zinc-500 hover:text-red-500 transition-colors flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="mt-12 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <p className="text-zinc-500">총 {students.length}명 입력됨</p>
            {students.length > 0 && (
              <button 
                onClick={onClearAll}
                className="text-xs text-red-500 hover:underline"
              >
                전체 삭제
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <Button onClick={onBack} variant="secondary">
              <ChevronLeft className="w-5 h-5 mr-1" /> 이전
            </Button>
            <Button onClick={onNext} disabled={students.length < 2}>
              다음 단계 <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
});

const SetupZombiesView = React.memo(({ 
  students, 
  onToggleZombie, 
  onStart,
  onBack
}: { 
  students: Student[]; 
  onToggleZombie: (id: string) => void; 
  onStart: () => void; 
  onBack: () => void;
}) => {
  const zombieCount = students.filter(s => s.isZombie).length;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto py-12"
    >
      <Card>
        <div className="flex items-center gap-3 mb-8">
          <Skull className="text-green-500" />
          <h2 className="text-2xl font-bold">최초 감염자 지목</h2>
        </div>

        <p className="text-zinc-400 mb-6">최초 감염자로 활동할 학생들을 선택하세요.</p>

        <div className="overflow-y-auto max-h-[400px] pr-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {students.map((s) => (
              <button 
                key={s.id}
                onClick={() => onToggleZombie(s.id)}
                className={`
                  p-4 rounded-2xl border-2 transition-all duration-200 text-center
                  ${s.isZombie 
                    ? 'bg-green-500/10 border-green-500 text-green-500 shadow-lg shadow-green-500/10' 
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'}
                `}
              >
                <span className="text-lg font-bold">{s.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-12 flex justify-between items-center">
          <p className="text-zinc-500">감염자: {zombieCount}명 / 비감염자: {students.length - zombieCount}명</p>
          <div className="flex gap-3">
            <Button onClick={onBack} variant="secondary">
              <ChevronLeft className="w-5 h-5 mr-1" /> 이전
            </Button>
            <Button onClick={onStart} disabled={zombieCount === 0} variant="neon">
              게임 시작 <Play className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
});

const GameView = React.memo(({ 
  students, 
  currentRound, 
  timeLeft, 
  isTimerRunning, 
  selectedIds, 
  onToggleSelection, 
  onHandleTouch, 
  onCureRequest, 
  onShowTeacherPage, 
  onNextRound,
  onForceRoundEnd,
  config,
  confirmCureId,
  onConfirmCureCancel,
  onConfirmCureAction,
  showTeacherPage,
  onTeacherPageClose,
  logs,
  onExport,
  onForceEnd,
  onToggleTimer,
  onAddSeconds
}: { 
  students: Student[]; 
  currentRound: number; 
  timeLeft: number; 
  isTimerRunning: boolean; 
  selectedIds: string[]; 
  onToggleSelection: (id: string) => void; 
  onHandleTouch: () => void; 
  onCureRequest: (id: string) => void; 
  onShowTeacherPage: () => void; 
  onNextRound: () => void;
  onForceRoundEnd: () => void;
  config: GameConfig;
  confirmCureId: string | null;
  onConfirmCureCancel: () => void;
  onConfirmCureAction: (id: string) => void;
  showTeacherPage: boolean;
  onTeacherPageClose: () => void;
  logs: GameLog[];
  onExport: () => void;
  onForceEnd: () => void;
  onToggleTimer: () => void;
  onAddSeconds: () => void;
}) => {
  const [isForceEndConfirmOpen, setIsForceEndConfirmOpen] = useState(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
        <div className="flex items-center gap-4">
          <div className="bg-purple-600 text-white px-4 py-2 rounded-full font-black text-xl">
            ROUND {currentRound}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* 라운드 종료 버튼 */}
          <Button 
            variant="secondary" 
            size="sm"
            onClick={onForceRoundEnd}
            className="border-red-500/40 text-red-400 hover:bg-red-950/20 px-4 h-11 text-sm font-bold rounded-2xl"
          >
            라운드 종료
          </Button>

          {/* 타이머 */}
          <div className={`
            flex items-center gap-4 px-8 py-4 rounded-3xl border-2 transition-colors
            ${timeLeft < 10 ? 'border-red-500 text-red-500 animate-pulse' : 'border-zinc-700 text-zinc-200'}
            bg-zinc-900/40 backdrop-blur-sm
          `}>
            <Timer className="w-8 h-8" />
            <span className="text-4xl font-mono font-bold">{formatTime(timeLeft)}</span>
          </div>

          <div className="flex gap-2">
            {/* 일시정지 / 시작 버튼 */}
            <Button 
              variant="secondary" 
              size="sm"
              onClick={onToggleTimer}
              className={`px-4 h-11 text-sm font-bold rounded-2xl ${!isTimerRunning ? 'border-green-500/40 text-green-400 hover:bg-green-950/20' : 'border-zinc-700 text-zinc-300'}`}
            >
              {isTimerRunning ? '일시정지' : '시작'}
            </Button>
            {/* +10초 버튼 */}
            <Button 
              variant="secondary" 
              size="sm"
              onClick={onAddSeconds}
              className="border-blue-500/40 text-blue-400 hover:bg-blue-950/20 px-4 h-11 text-sm font-bold rounded-2xl"
            >
              +10초
            </Button>
          </div>
        </div>

        <div className="flex gap-4 items-center">
          <div className="text-center">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">감염자</p>
            <p className="text-2xl font-black text-green-500">?</p>
          </div>
          <div className="w-px h-10 bg-zinc-800" />
          <div className="text-center">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">비감염자</p>
            <p className="text-2xl font-black text-white">?</p>
          </div>
        </div>
      </div>

      {/* Student Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-32 pt-4 px-1">
        {students.map((s) => (
            <button
              key={s.id}
              disabled={!isTimerRunning}
              onClick={() => onToggleSelection(s.id)}
              className={`
                relative p-6 rounded-2xl border-2 transition-all duration-300 text-center group overflow-hidden
                ${selectedIds.includes(s.id) 
                  ? 'border-purple-500 bg-purple-500/20 -translate-y-2 shadow-[0_0_25px_rgba(168,85,247,0.4)]' 
                  : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:-translate-y-1'}
                ${!isTimerRunning ? 'opacity-50 grayscale' : ''}
              `}
            >
              <span className={`text-xl font-bold block mb-1 transition-colors ${selectedIds.includes(s.id) ? 'text-purple-400' : 'text-white'}`}>
                {s.name}
              </span>
              <div className="flex flex-col gap-1 items-center">
                {s.touchedThisRound && (
                  <span className="text-[10px] bg-blue-500/80 text-white px-2 py-0.5 rounded-full uppercase font-black backdrop-blur-sm">
                    Touched
                  </span>
                )}
              </div>
              
              <AnimatePresence>
                {selectedIds.includes(s.id) && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="absolute top-2 right-2"
                  >
                    <div className="bg-purple-500 rounded-full p-1 shadow-lg shadow-purple-500/50">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {selectedIds.includes(s.id) && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent pointer-events-none"
                />
              )}
            </button>
          ))}
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-4 z-50">
        <div className="flex items-center gap-4 bg-black/40 backdrop-blur-md p-4 rounded-full border border-zinc-800/50 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          <Button 
            size="lg" 
            variant="neon" 
            disabled={selectedIds.length !== 2 || !isTimerRunning}
            onClick={onHandleTouch}
            className={`h-20 w-48 text-xl transition-all duration-300 ${selectedIds.length === 2 && isTimerRunning ? 'opacity-100 scale-100' : 'opacity-20 scale-95 pointer-events-none'}`}
          >
            <Zap className="w-8 h-8" /> 터치
          </Button>
          
          <Button 
            size="lg" 
            variant="secondary" 
            disabled={selectedIds.length !== 1 || !isTimerRunning}
            onClick={() => onCureRequest(selectedIds[0])}
            className={`h-20 w-48 text-xl border-red-500/50 transition-all duration-300 ${selectedIds.length === 1 && isTimerRunning ? 'opacity-100 scale-100' : 'opacity-20 scale-95 pointer-events-none'}`}
          >
            <Heart className="w-8 h-8 text-red-500" /> 치료제
          </Button>
        </div>
      </div>

      {/* Teacher Page Button */}
      <div className="fixed bottom-20 right-8 z-50">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={onShowTeacherPage}
          className="text-zinc-600 hover:text-zinc-400 bg-black/20 backdrop-blur-sm rounded-full px-4"
        >
          교사 페이지
        </Button>
      </div>

      {/* Force End Game Button */}
      <div className="fixed bottom-16 left-8 z-50">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setIsForceEndConfirmOpen(true)}
          className="text-red-500 hover:text-red-400 hover:bg-red-950/20 bg-black/20 backdrop-blur-sm rounded-full px-4"
        >
          게임 강제 종료
        </Button>
      </div>

      {/* Force End Confirmation Modal */}
      <AnimatePresence>
        {isForceEndConfirmOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6"
          >
            <Card className="max-w-sm w-full text-center">
              <AlertTriangle className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2 text-white">게임 종료</h3>
              <p className="text-zinc-400 mb-6">게임을 종료하시겠습니까?</p>
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setIsForceEndConfirmOpen(false)}>취소</Button>
                <Button variant="danger" className="flex-1" onClick={() => { setIsForceEndConfirmOpen(false); onForceEnd(); }}>확인</Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cure Confirmation Modal */}
      <AnimatePresence>
        {confirmCureId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6"
          >
            <Card className="max-w-sm w-full text-center">
              <Heart className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">치료제 사용</h3>
              <p className="text-zinc-400 mb-6">치료제를 사용하시겠습니까?</p>
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={onConfirmCureCancel}>취소</Button>
                <Button variant="danger" className="flex-1" onClick={() => onConfirmCureAction(confirmCureId)}>사용하기</Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Round End Overlay */}
      {!isTimerRunning && timeLeft === 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6"
        >
          <Card className="max-w-md w-full text-center">
            <h2 className="text-3xl font-black mb-4">ROUND {currentRound} 종료</h2>
            <div className="flex justify-center gap-8 mb-8">
              <div className="text-center">
                <p className="text-xs text-zinc-500 uppercase mb-1">감염자 수</p>
                <p className="text-3xl font-black text-green-500">{students.filter(s => s.isZombie || !s.touchedThisRound).length}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-zinc-500 uppercase mb-1">비감염자 수</p>
                <p className="text-3xl font-black text-white">{students.filter(s => !s.isZombie && s.touchedThisRound).length}</p>
              </div>
            </div>
            <p className="text-zinc-400 mb-8">터치하지 않은 학생은 감염자가 되었습니다.</p>
            <Button size="lg" className="w-full" onClick={onNextRound}>
              {currentRound === config.totalRounds ? '결과 보기' : '다음 라운드 시작'} <ChevronRight className="w-5 h-5" />
            </Button>
          </Card>
        </motion.div>
      )}

      {/* Teacher Page Modal */}
      <TeacherPage 
        show={showTeacherPage} 
        onClose={onTeacherPageClose} 
        students={students} 
        logs={logs}
        onExport={onExport}
      />
    </div>
  );
});

const ResultsView = React.memo(({ 
  students, 
  onExport,
  onRestart,
}: {
  students: Student[];
  onExport: () => void;
  onRestart: () => void;
}) => {
  const [zombieCount, setZombieCount] = useState(0);
  const [humanCount, setHumanCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  const actualZombies = students.filter(s => s.isZombie).length;
  const actualHumans = students.filter(s => !s.isZombie).length;

  useEffect(() => {
    let z = 0;
    let h = 0;
    const interval = setInterval(() => {
      let finished = true;
      if (z < actualZombies) {
        z++;
        setZombieCount(z);
        finished = false;
      }
      if (h < actualHumans) {
        h++;
        setHumanCount(h);
        finished = false;
      }
      if (finished) {
        clearInterval(interval);
        setIsAnimating(false);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [actualZombies, actualHumans]);

  // Win Condition: Zombie wins only if everyone is a zombie.
  // Human wins if at least one human survives.
  const winner = actualHumans === 0 ? 'ZOMBIE' : 'HUMAN';

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto py-12 text-center"
    >
      <h2 className="text-2xl font-bold text-zinc-500 uppercase tracking-widest mb-12">최종 결과</h2>
      
      <div className="grid grid-cols-2 gap-12 mb-20">
        <div className={`p-12 rounded-3xl border-4 transition-all duration-500 ${winner === 'ZOMBIE' ? 'border-green-500 bg-green-500/10 scale-110' : 'border-zinc-800'}`}>
          <Skull className={`w-16 h-16 mx-auto mb-4 ${winner === 'ZOMBIE' ? 'text-green-500' : 'text-zinc-700'}`} />
          <p className="text-7xl font-black mb-2">{zombieCount}</p>
          <p className="text-xl font-bold text-zinc-500">감염자 진영</p>
        </div>
        <div className={`p-12 rounded-3xl border-4 transition-all duration-500 ${winner === 'HUMAN' ? 'border-purple-500 bg-purple-500/10 scale-110' : 'border-zinc-800'}`}>
          <Users className={`w-16 h-16 mx-auto mb-4 ${winner === 'HUMAN' ? 'text-purple-500' : 'text-zinc-700'}`} />
          <p className="text-7xl font-black mb-2">{humanCount}</p>
          <p className="text-xl font-bold text-zinc-500">비감염자 진영</p>
        </div>
      </div>

      {!isAnimating && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <h1 className={`text-8xl font-black mb-8 tracking-tighter ${winner === 'ZOMBIE' ? 'text-green-500' : 'text-purple-500'}`}>
            {winner === 'ZOMBIE' ? '감염자 승리' : '비감염자 승리'}
          </h1>

          {winner === 'HUMAN' && (
            <div className="max-w-2xl mx-auto mb-12">
              <h3 className="text-xl font-bold mb-4 text-zinc-400">개별 승점 순위 (비감염자만 표시)</h3>
              <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2">
                {students
                  .filter(s => !s.isZombie)
                  .sort((a, b) => b.points - a.points)
                  .map(s => (
                    <div key={s.id} className="flex justify-between p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                      <span className="font-bold">{s.name}</span>
                      <span className="text-purple-500 font-black">{s.points}pt</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="flex gap-4 justify-center mt-8">
            <Button size="lg" variant="secondary" onClick={onExport}>
              <FileSpreadsheet className="w-6 h-6" /> 결과 엑셀 다운로드
            </Button>
            <Button size="lg" variant="secondary" onClick={onRestart}>
              <RotateCcw className="w-6 h-6" /> 처음으로 돌아가기
            </Button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
});

// --- Main Application ---

export default function App() {
  const [initialSave] = useState(loadSave);
  const [savedGame, setSavedGame] = useState(initialSave.game);
  const [saveError, setSaveError] = useState(initialSave.error);
  const [persistenceEnabled, setPersistenceEnabled] = useState(false);
  const [view, setView] = useState<GameState>('START');
  const [students, setStudents] = useState<Student[]>([]);
  const [config, setConfig] = useState<GameConfig>({ roundTime: 120, totalRounds: 3 });
  const [currentRound, setCurrentRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modal, setModal] = useState<{ 
    title: string; 
    message: string; 
    type: 'info' | 'success' | 'warning';
    onConfirm?: () => void;
    onCancel?: () => void;
  } | null>(null);
  const [showTeacherPage, setShowTeacherPage] = useState(false);
  const [logs, setLogs] = useState<GameLog[]>([]);
  const [confirmCureId, setConfirmCureId] = useState<string | null>(null);
  const [touchHistory, setTouchHistory] = useState<string[]>([]);
  const [isIntroOpen, setIsIntroOpen] = useState(false);
  const [teacherNoticeOpen, setTeacherNoticeOpen] = useState(false);
  const [suppressTeacherNotice, setSuppressTeacherNotice] = useState(false);

  useEffect(() => installButtonSounds(), []);

  // --- Logic Handlers ---

  const appendLogs = React.useCallback((entries: LogEntry[]) => {
    const additions = entries.map(entry => ({ ...entry, id: createId(), timestamp: new Date().toISOString() })).reverse();
    setLogs(prev => [...additions, ...prev]);
  }, []);

  const removeStudent = React.useCallback((id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
  }, []);

  const toggleZombie = React.useCallback((id: string) => {
    setStudents(prev => prev.map(s => 
      s.id === id ? { ...s, isZombie: !s.isZombie, isOriginalZombie: !s.isZombie } : s
    ));
  }, []);

  const startRound = React.useCallback(() => {
    if (!isValidRoundTime(config.roundTime) || students.length < 2 || !students.some(s => s.isZombie)) return;
    const entries: LogEntry[] = [];
    if (currentRound === 1) entries.push({ round: 1, type: 'GAME_START', message: `게임 시작! 최초 감염자: ${students.filter(s => s.isZombie).map(s => s.name).join(', ')}` });
    entries.push({ round: currentRound, type: 'ROUND_START', message: `${currentRound}라운드 시작!` });
    appendLogs(entries);
    setTimeLeft(config.roundTime);
    setIsTimerRunning(true);
    setView('GAME');
  }, [students, currentRound, appendLogs, config.roundTime]);

  const handleTouch = React.useCallback(() => {
    if (!isTimerRunning || timeLeft <= 0) return;
    const result = resolveTouch(students, selectedIds, touchHistory, currentRound);
    setSelectedIds([]);
    if ('error' in result) {
      setModal({ title: '터치 불가', message: result.error, type: 'warning' });
      return;
    }
    setStudents(result.students);
    setTouchHistory(prev => [...prev, result.pairId]);
    appendLogs([result.log]);
  }, [isTimerRunning, timeLeft, students, selectedIds, touchHistory, currentRound, appendLogs]);

  const handleCure = React.useCallback((id: string) => {
    if (!isTimerRunning || timeLeft <= 0) { setConfirmCureId(null); return; }
    const result = resolveCure(students, id, currentRound);
    if (!result) return;
    setStudents(result.students);
    appendLogs([result.log]);
    setModal({ title: '치료제 사용', message: '치료제를 사용하였습니다.', type: 'success' });
    setConfirmCureId(null);
    setSelectedIds([]);
  }, [isTimerRunning, timeLeft, students, currentRound, appendLogs]);

  const exportToExcel = React.useCallback(() => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(logRows(logs)), '게임 로그');
    const summary = [
      ['학생 ID', '학생명', '현재 상태', '누적승점', '최초감염자', '현재 라운드'],
      ...students.map(s => [s.id, s.name, statusOf(s), s.points, s.isOriginalZombie ? 'O' : 'X', currentRound]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), '학생 현황');
    XLSX.writeFile(wb, `바이러스게임_결과_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [logs, students, currentRound]);

  const nextRound = React.useCallback(() => {
    if (isTimerRunning || timeLeft !== 0) return;
    const result = resolveRoundEnd(students, currentRound, config.totalRounds);
    setStudents(result.students);
    appendLogs(result.logs);
    setSelectedIds([]);
    setConfirmCureId(null);
    setCurrentRound(result.round);
    if (!result.finished) {
      setTimeLeft(config.roundTime);
      setIsTimerRunning(true);
    } else {
      setIsTimerRunning(false);
      setView('RESULTS');
    }
  }, [isTimerRunning, timeLeft, students, currentRound, config, appendLogs]);

  // --- View Navigation Handlers ---
  const handleStart = React.useCallback(() => {
    if (savedGame) {
      setModal({ title: '새 게임 시작', message: '저장된 게임을 지우고 새 게임을 시작하시겠습니까?', type: 'warning', onConfirm: () => {
        setSaveError(clearSave());
        setSavedGame(null);
        setStudents([]);
        setLogs([]);
        setTouchHistory([]);
        setCurrentRound(1);
        setTimeLeft(0);
        setIsTimerRunning(false);
        setPersistenceEnabled(false);
        setIsIntroOpen(true);
      } });
    } else setIsIntroOpen(true);
  }, [savedGame]);
  const handleResume = React.useCallback(() => {
    if (!savedGame) return;
    setStudents(savedGame.students);
    setConfig(savedGame.config);
    setCurrentRound(savedGame.currentRound);
    setTimeLeft(savedGame.timeLeft);
    setLogs(savedGame.logs);
    setTouchHistory(savedGame.touchHistory);
    setView(savedGame.view);
    setIsTimerRunning(false);
    setSelectedIds([]);
    setConfirmCureId(null);
    setShowTeacherPage(false);
    setPersistenceEnabled(true);
    setSavedGame(null);
  }, [savedGame]);
  const handleIntroStartGame = React.useCallback(() => {
    setIsIntroOpen(false);
    setView('SETUP_CONFIG');
    setPersistenceEnabled(true);
  }, []);
  const handleConfigNext = React.useCallback((newConfig: GameConfig) => {
    if (!isValidRoundTime(newConfig.roundTime)) {
      setModal({ title: '시간 설정 오류', message: '제한 시간은 1초 이상의 정수로 입력해주세요.', type: 'warning' });
      return;
    }
    setConfig(newConfig);
    setView('SETUP_STUDENTS');
  }, []);
  const handleStudentsAdd = React.useCallback((names: string[]) => {
    const newStudents: Student[] = names.map(name => ({
      id: createId(),
      name,
      isZombie: false,
      isOriginalZombie: false,
      infectedThisRound: false,
      points: 0,
      touchedThisRound: false,
    }));
    setStudents(prev => [...prev, ...newStudents]);
  }, []);
  const handleStudentsNext = React.useCallback(() => setView('SETUP_ZOMBIES'), []);
  const handleToggleSelection = React.useCallback((id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      } else if (prev.length < 2) {
        return [...prev, id];
      }
      return prev;
    });
  }, []);
  const handleCureRequest = React.useCallback((id: string) => {
    if (students.some(s => s.id === id)) setConfirmCureId(id);
  }, [students]);
  const handleShowTeacherPage = React.useCallback(() => {
    try {
      if (localStorage.getItem('virus-game.teacher-notice.dismissed') === 'true') {
        setShowTeacherPage(true);
        return;
      }
    } catch { /* Show the warning when preferences cannot be read. */ }
    setSuppressTeacherNotice(false);
    setTeacherNoticeOpen(true);
  }, []);
  const handleTeacherNoticeConfirm = React.useCallback(() => {
    if (suppressTeacherNotice) {
      try { localStorage.setItem('virus-game.teacher-notice.dismissed', 'true'); } catch { /* Preference remains session-only. */ }
    }
    setTeacherNoticeOpen(false);
    setShowTeacherPage(true);
  }, [suppressTeacherNotice]);
  const handleCloseTeacherPage = React.useCallback(() => setShowTeacherPage(false), []);
  const handleConfirmCureCancel = React.useCallback(() => setConfirmCureId(null), []);
  const handleClearAll = React.useCallback(() => setStudents([]), []);

  const handleToggleTimer = React.useCallback(() => {
    if (timeLeft > 0) setIsTimerRunning(prev => !prev);
  }, [timeLeft]);

  const handleAddSeconds = React.useCallback(() => {
    setTimeLeft(prev => Number.isSafeInteger(prev + 10) ? prev + 10 : prev);
  }, []);

  const handleRoundEndRequest = React.useCallback(() => {
    setIsTimerRunning(false);
    setModal({
      title: '라운드 종료 확인',
      onCancel: () => setIsTimerRunning(isTimerRunning && timeLeft > 0),
      message: '해당 라운드를 종료하시겠습니까? 확인을 누르면 감염 여부가 확정되고 라운드 결과 정산 및 다음 단계로 이동합니다.',
      type: 'warning',
      onConfirm: () => {
        setIsTimerRunning(false);
        setTimeLeft(0);
      }
    });
  }, [isTimerRunning, timeLeft]);

  const handleForceEnd = React.useCallback(() => {
    setPersistenceEnabled(false);
    setSaveError(clearSave());
    setSavedGame(null);
    setTimeLeft(0);
    setModal(null);
    setConfirmCureId(null);
    setShowTeacherPage(false);
    setView('START');
    setIsTimerRunning(false);
    setCurrentRound(1);
    setLogs([]);
    setTouchHistory([]);
    setSelectedIds([]);
    setStudents(prev => prev.map(s => ({
      ...s,
      isZombie: false,
      isOriginalZombie: false,
      infectedThisRound: false,
      points: 0,
      touchedThisRound: false
    })));
  }, []);

  // Restore is always paused: time away from the classroom does not consume a round.
  useEffect(() => {
    if (!persistenceEnabled || view === 'START') return;
    const game: SavedGame = { version: 1, savedAt: new Date().toISOString(), view, students, config, currentRound, timeLeft, logs, touchHistory };
    setSaveError(writeSave(game));
  }, [persistenceEnabled, view, students, config, currentRound, timeLeft, logs, touchHistory]);

  // --- Timer Effect ---
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isTimerRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => Math.max(0, prev - 1));
      }, 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      setConfirmCureId(null);
      setModal({ 
        title: '라운드 종료', 
        message: '시간이 모두 경과했습니다. 해당 라운드 결과를 정산합니다.', 
        type: 'info'
      });
    }
    return () => clearInterval(timer);
  }, [isTimerRunning, timeLeft]);

  // --- Views ---

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-purple-500/30">
      <SceneBackground view={view} humanSurvived={students.some(student => !student.isZombie)} />

      <main className="relative z-10 container mx-auto px-4 py-8 pb-64">
        <BackgroundMusic view={view} />
        {saveError && <div role="alert" className="max-w-4xl mx-auto mb-4 rounded-xl border border-amber-500 p-4 text-amber-200">{saveError}</div>}
        {view === 'START' && savedGame && (
          <Card className="max-w-2xl mx-auto mb-6">
            <h2 className="text-xl font-bold mb-2">저장된 게임이 있습니다</h2>
            <p className="text-zinc-400 mb-4">{new Date(savedGame.savedAt).toLocaleString()} · {savedGame.students.length}명 · {savedGame.view === 'GAME' ? `${savedGame.currentRound}라운드` : savedGame.view === 'RESULTS' ? '최종 결과' : '게임 설정 중'}</p>
            <Button onClick={handleResume}>이어하기</Button>
            <p className="text-sm text-zinc-400 mt-3">진행 중이던 게임은 일시정지 상태로 복구됩니다. 확인 후 타이머 시작을 눌러주세요.</p>
          </Card>
        )}
        {persistenceEnabled && !saveError && <p className="text-center text-xs text-zinc-500 mb-4">이 브라우저에 자동 저장 중 · 이어하기 시 타이머는 일시정지로 복구됩니다.</p>}
        <AnimatePresence mode="wait">
          {view === 'START' && <StartView key="start" onStart={handleStart} />}
          {view === 'SETUP_CONFIG' && (
            <SetupConfigView 
              key="setup-config" 
              config={config} 
              onNext={handleConfigNext} 
              onBack={() => {
                const saved = loadSave();
                setSavedGame(saved.game);
                setSaveError(saved.error);
                setPersistenceEnabled(false);
                setView('START');
              }}
            />
          )}
          {view === 'SETUP_STUDENTS' && (
            <SetupStudentsView 
              key="setup-students" 
              students={students}
              onAddStudents={handleStudentsAdd}
              onRemoveStudent={removeStudent}
              onClearAll={handleClearAll}
              onNext={handleStudentsNext}
              onBack={() => setView('SETUP_CONFIG')}
            />
          )}
          {view === 'SETUP_ZOMBIES' && (
            <SetupZombiesView 
              key="setup-zombies" 
              students={students}
              onToggleZombie={toggleZombie}
              onStart={startRound}
              onBack={() => setView('SETUP_STUDENTS')}
            />
          )}
          {view === 'GAME' && (
            <GameView 
              key="game" 
              students={students}
              currentRound={currentRound}
              timeLeft={timeLeft}
              isTimerRunning={isTimerRunning}
              selectedIds={selectedIds}
              onToggleSelection={handleToggleSelection}
              onHandleTouch={handleTouch}
              onCureRequest={handleCureRequest}
              onShowTeacherPage={handleShowTeacherPage}
              onNextRound={nextRound}
              onForceRoundEnd={handleRoundEndRequest}
              config={config}
              confirmCureId={confirmCureId}
              onConfirmCureCancel={handleConfirmCureCancel}
              onConfirmCureAction={handleCure}
              showTeacherPage={showTeacherPage}
              onTeacherPageClose={handleCloseTeacherPage}
              logs={logs}
              onExport={exportToExcel}
              onForceEnd={handleForceEnd}
              onToggleTimer={handleToggleTimer}
              onAddSeconds={handleAddSeconds}
            />
          )}
          {view === 'RESULTS' && (
            <ResultsView 
              onRestart={() => { handleForceEnd(); setStudents([]); }}
              key="results" 
              students={students}
              onExport={exportToExcel}
            />
          )}
        </AnimatePresence>
      </main>

      <footer className="relative z-0 py-16 text-center border-t border-zinc-800/50 mt-32 bg-black/50">
        <div className="container mx-auto px-4">
          <p className="text-zinc-500 text-sm mb-2">제안이나 문의사항이 있으시면 언제든 메일 주세요.</p>
          <p className="text-zinc-400 text-sm font-medium mb-4">Contact: <a href="mailto:sinjoppo@naver.com" className="hover:text-purple-400 transition-colors">sinjoppo@naver.com</a></p>
          <p className="text-zinc-600 text-xs tracking-wider uppercase">ⓒ 2026. Kwon's class. All rights reserved.</p>
        </div>
      </footer>

      {/* Modal / Notification */}
      <AnimatePresence>
        {modal && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 flex items-center justify-center z-[100] p-6 bg-black/40 backdrop-blur-sm"
          >
            <Card className="max-w-sm w-full">
              <div className="flex items-center gap-3 mb-4">
                {modal.type === 'success' && <CheckCircle2 className="text-green-500" />}
                {modal.type === 'warning' && <AlertTriangle className="text-amber-500" />}
                {modal.type === 'info' && <Zap className="text-blue-500" />}
                <h3 className="text-xl font-bold">{modal.title}</h3>
              </div>
              <p className="text-zinc-400 mb-6 text-sm leading-relaxed">{modal.message}</p>
              <div className="flex gap-3">
                {modal.onConfirm && (
                  <Button variant="secondary" className="flex-1" onClick={() => { modal.onCancel?.(); setModal(null); }}>취소</Button>
                )}
                <Button 
                  className="flex-1" 
                  onClick={() => { 
                    const confirmFn = modal.onConfirm;
                    setModal(null); 
                    if (confirmFn) {
                      confirmFn();
                    }
                  }}
                >
                  확인
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {teacherNoticeOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 p-6 backdrop-blur-md">
            <Card className="w-full max-w-md" >
              <div role="dialog" aria-modal="true" aria-labelledby="teacher-notice-title">
                <div className="mb-4 flex items-center gap-3">
                  <AlertTriangle className="h-7 w-7 text-amber-400" aria-hidden="true" />
                  <h2 id="teacher-notice-title" className="text-xl font-bold">교사 페이지 안내</h2>
                </div>
                <p className="mb-5 leading-relaxed text-zinc-300">교사 페이지에는 감염 상태와 점수가 표시됩니다. 학생들에게 노출되지 않도록 주의해 주세요.</p>
                <label className="mb-6 flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-zinc-200">
                  <input type="checkbox" checked={suppressTeacherNotice} onChange={event => setSuppressTeacherNotice(event.target.checked)} className="h-5 w-5 accent-purple-500" />
                  다시 뜨지 않음
                </label>
                <div className="flex gap-3">
                  <Button variant="secondary" className="flex-1" onClick={() => setTeacherNoticeOpen(false)}>취소</Button>
                  <Button className="flex-1" onClick={handleTeacherNoticeConfirm}>확인</Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Intro Story Modal */}
      <IntroStoryModal 
        isOpen={isIntroOpen} 
        onClose={() => setIsIntroOpen(false)} 
        onStartGame={handleIntroStartGame} 
      />
    </div>
  );
}
