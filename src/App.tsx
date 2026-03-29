/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
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
  Plus,
  X,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { Student, GameState, GameConfig, GameLog } from './types';

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
  size = 'md'
}: { 
  children: React.ReactNode, 
  onClick?: () => void, 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'neon',
  disabled?: boolean,
  className?: string,
  size?: 'sm' | 'md' | 'lg'
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
                      {s.isZombie && <span className="text-[8px] bg-green-500 text-black px-1 rounded uppercase font-bold">Zombie</span>}
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
                        <span className="text-[10px] text-zinc-600">{log.timestamp}</span>
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

const StartView = React.memo(({ onStart }: { onStart: () => void }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center min-h-[80vh] text-center"
  >
    <Skull className="w-24 h-24 text-green-500 mb-6 animate-pulse" />
    <h1 className="text-6xl font-black mb-4 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-green-500">
      ZOMBIE GAME
    </h1>
    <p className="text-zinc-400 mb-12 max-w-md">
      '더 지니어스' 스타일의 좀비 게임 관리 시스템. 교실에서 긴장감 넘치는 게임을 시작하세요.
    </p>
    <Button size="lg" onClick={onStart} variant="neon">
      게임 시작하기 <ChevronRight className="w-6 h-6" />
    </Button>
  </motion.div>
));

const SetupConfigView = React.memo(({ 
  config, 
  onNext 
}: { 
  config: GameConfig; 
  onNext: (newConfig: GameConfig) => void 
}) => {
  const [localRoundTime, setLocalRoundTime] = useState(config.roundTime);

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
              type="number" 
              value={localRoundTime}
              onChange={(e) => setLocalRoundTime(parseInt(e.target.value) || 0)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
            <p className="text-sm text-zinc-400">총 라운드는 <span className="text-purple-500 font-bold">3라운드</span>로 고정되어 있습니다.</p>
          </div>
        </div>

        <div className="mt-12 flex justify-end">
          <Button onClick={() => onNext({ roundTime: localRoundTime, totalRounds: 3 })}>
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
  onNext 
}: { 
  students: Student[]; 
  onAddStudents: (names: string[]) => void; 
  onRemoveStudent: (id: string) => void; 
  onClearAll: () => void; 
  onNext: () => void; 
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
          <Button onClick={onNext} disabled={students.length < 2}>
            다음 단계 <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </Card>
    </motion.div>
  );
});

const SetupZombiesView = React.memo(({ 
  students, 
  onToggleZombie, 
  onStart 
}: { 
  students: Student[]; 
  onToggleZombie: (id: string) => void; 
  onStart: () => void; 
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
          <h2 className="text-2xl font-bold">최초 좀비 지목</h2>
        </div>

        <p className="text-zinc-400 mb-6">최초 좀비로 활동할 학생들을 선택하세요.</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

        <div className="mt-12 flex justify-between items-center">
          <p className="text-zinc-500">좀비: {zombieCount}명 / 인간: {students.length - zombieCount}명</p>
          <Button onClick={onStart} disabled={zombieCount === 0} variant="neon">
            게임 시작 <Play className="w-5 h-5" />
          </Button>
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
  config,
  confirmCureId,
  onConfirmCureCancel,
  onConfirmCureAction,
  showTeacherPage,
  onTeacherPageClose,
  logs,
  onExport
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
  config: GameConfig;
  confirmCureId: string | null;
  onConfirmCureCancel: () => void;
  onConfirmCureAction: (id: string) => void;
  showTeacherPage: boolean;
  onTeacherPageClose: () => void;
  logs: GameLog[];
  onExport: () => void;
}) => {
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
        
        <div className={`
          flex items-center gap-4 px-8 py-4 rounded-3xl border-2 transition-colors
          ${timeLeft < 10 ? 'border-red-500 text-red-500 animate-pulse' : 'border-zinc-700 text-zinc-200'}
        `}>
          <Timer className="w-8 h-8" />
          <span className="text-4xl font-mono font-bold">{formatTime(timeLeft)}</span>
        </div>

        <div className="flex gap-4 items-center">
          <div className="text-center">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">좀비</p>
            <p className="text-2xl font-black text-green-500">?</p>
          </div>
          <div className="w-px h-10 bg-zinc-800" />
          <div className="text-center">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">인간</p>
            <p className="text-2xl font-black text-white">?</p>
          </div>
        </div>
      </div>

      {/* Student Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-32">
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
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 z-40">
        <div className="flex items-center gap-4">
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
      <div className="fixed bottom-8 right-8 z-40">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={onShowTeacherPage}
          className="text-zinc-600 hover:text-zinc-400"
        >
          교사 페이지
        </Button>
      </div>

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
                <p className="text-xs text-zinc-500 uppercase mb-1">좀비 수</p>
                <p className="text-3xl font-black text-green-500">{students.filter(s => s.isZombie).length}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-zinc-500 uppercase mb-1">인간 수</p>
                <p className="text-3xl font-black text-white">{students.filter(s => !s.isZombie).length}</p>
              </div>
            </div>
            <p className="text-zinc-400 mb-8">터치하지 않은 학생은 좀비가 되었습니다.</p>
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
  onExport 
}: { 
  students: Student[]; 
  onExport: () => void 
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
          <p className="text-xl font-bold text-zinc-500">좀비 진영</p>
        </div>
        <div className={`p-12 rounded-3xl border-4 transition-all duration-500 ${winner === 'HUMAN' ? 'border-purple-500 bg-purple-500/10 scale-110' : 'border-zinc-800'}`}>
          <Users className={`w-16 h-16 mx-auto mb-4 ${winner === 'HUMAN' ? 'text-purple-500' : 'text-zinc-700'}`} />
          <p className="text-7xl font-black mb-2">{humanCount}</p>
          <p className="text-xl font-bold text-zinc-500">인간 진영</p>
        </div>
      </div>

      {!isAnimating && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <h1 className={`text-8xl font-black mb-8 tracking-tighter ${winner === 'ZOMBIE' ? 'text-green-500' : 'text-purple-500'}`}>
            {winner === 'ZOMBIE' ? 'ZOMBIE WIN' : 'HUMAN WIN'}
          </h1>

          {winner === 'HUMAN' && (
            <div className="max-w-2xl mx-auto mb-12">
              <h3 className="text-xl font-bold mb-4 text-zinc-400">개별 승점 순위 (인간만 표시)</h3>
              <div className="grid grid-cols-2 gap-2">
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
            <Button size="lg" variant="secondary" onClick={() => window.location.reload()}>
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
  const [view, setView] = useState<GameState>('START');
  const [students, setStudents] = useState<Student[]>([]);
  const [config, setConfig] = useState<GameConfig>({ roundTime: 120, totalRounds: 3 });
  const [currentRound, setCurrentRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modal, setModal] = useState<{ title: string; message: string; type: 'info' | 'success' | 'warning' } | null>(null);
  const [showTeacherPage, setShowTeacherPage] = useState(false);
  const [logs, setLogs] = useState<GameLog[]>([]);
  const [confirmCureId, setConfirmCureId] = useState<string | null>(null);
  const [touchHistory, setTouchHistory] = useState<string[]>([]);

  // --- Logic Handlers ---

  const addLog = React.useCallback((
    message: string, 
    type: GameLog['type'],
    details?: Partial<GameLog>
  ) => {
    const newLog: GameLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      round: currentRound,
      message,
      type,
      ...details
    };
    setLogs(prev => [newLog, ...prev]);
  }, [currentRound]);

  const addStudent = React.useCallback((name: string) => {
    if (!name.trim()) return;
    const newStudent: Student = {
      id: Math.random().toString(36).substr(2, 9),
      name: name.trim(),
      isZombie: false,
      isOriginalZombie: false,
      infectedThisRound: false,
      points: 0,
      touchedThisRound: false,
    };
    setStudents(prev => [...prev, newStudent]);
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
    setStudents(prev => {
      if (currentRound === 1) {
        const initialZombies = prev.filter(s => s.isZombie).map(s => s.name).join(', ');
        addLog(`게임 시작! 최초 좀비: ${initialZombies}`, 'GAME_START');
      }
      return prev;
    });
    addLog(`${currentRound}라운드 시작!`, 'ROUND_START');
    setTimeLeft(config.roundTime);
    setIsTimerRunning(true);
    setView('GAME');
  }, [currentRound, addLog, config.roundTime]);

  const handleTouch = React.useCallback(() => {
    if (selectedIds.length !== 2) return;
    
    const [id1, id2] = selectedIds;
    
    // Check for duplicate touch
    const pairId = [id1, id2].sort().join('-');
    if (touchHistory.includes(pairId)) {
      setModal({ title: '터치 불가', message: '이미 접촉을 완료했습니다.', type: 'warning' });
      setSelectedIds([]);
      return;
    }

    const s1 = students.find(s => s.id === id1)!;
    const s2 = students.find(s => s.id === id2)!;

    let infectionOccurred = false;
    let logMsg = "";

    if (s1.isZombie || s2.isZombie) {
      // Zombie touch
      setStudents(prev => prev.map(s => {
        if (s.id === id1 || s.id === id2) {
          const updated = { ...s, touchedThisRound: true };
          if (!s.isZombie) {
            infectionOccurred = true;
            return { ...updated, isZombie: true, infectedThisRound: true };
          }
          return updated;
        }
        return s;
      }));
      logMsg = `${s1.name}와(과) ${s2.name} 터치! ${s1.isZombie && s2.isZombie ? '좀비 접촉' : '감염 발생'} (승점 없음)`;
      addLog(logMsg, 'TOUCH', {
        student1: s1.name,
        status1: s1.isZombie ? '좀비' : '인간',
        student2: s2.name,
        status2: s2.isZombie ? '좀비' : '인간',
        pointsAwarded: 0,
        cumulativePoints: 0,
        isOriginalZombie: s1.isOriginalZombie,
        vaccineUsed: false
      });
    } else {
      // Human-Human touch
      setStudents(prev => prev.map(s => {
        if (s.id === id1 || s.id === id2) {
          return { ...s, touchedThisRound: true, points: s.points + 1 };
        }
        return s;
      }));
      logMsg = `${s1.name}와(과) ${s2.name} 터치! 안전 (+1점)`;
      addLog(logMsg, 'TOUCH', {
        student1: s1.name,
        status1: '인간',
        student2: s2.name,
        status2: '인간',
        pointsAwarded: 1,
        cumulativePoints: s1.points + 1,
        isOriginalZombie: s1.isOriginalZombie,
        vaccineUsed: false
      });
    }
    
    setTouchHistory(prev => [...prev, pairId]);
    setSelectedIds([]);
  }, [selectedIds, students, addLog, touchHistory]);

  const handleCure = React.useCallback((id: string) => {
    const student = students.find(s => s.id === id);
    if (!student) return;

    const wasInfected = student.infectedThisRound;

    setStudents(prev => prev.map(s => {
      if (s.id === id && s.infectedThisRound) {
        return { ...s, isZombie: false, infectedThisRound: false };
      }
      return s;
    }));

    addLog(`${student.name} 치료제 사용! ${wasInfected ? '인간으로 복구' : '변화 없음'}`, 'CURE', {
      student1: student.name,
      status1: '인간',
      pointsAwarded: 0,
      cumulativePoints: student.points,
      isOriginalZombie: student.isOriginalZombie,
      vaccineUsed: true
    });
    setModal({ title: '치료 완료', message: '치료제를 사용하였습니다.', type: 'success' });
    setConfirmCureId(null);
    setSelectedIds([]);
  }, [students, addLog]);

  const exportToExcel = React.useCallback(() => {
    const headers = ['라운드', '터치1(학생명)', '상태', '터치 2(학생명)', '상태', '승점', '누적승점', '최초좀비여부', '백신 사용 여부', '메시지', '시간'];
    const data = logs.map(l => [
      l.round,
      l.student1 || '-',
      l.status1 || '-',
      l.student2 || '-',
      l.status2 || '-',
      l.pointsAwarded ?? 0,
      l.cumulativePoints ?? 0,
      l.isOriginalZombie ? 'O' : 'X',
      l.vaccineUsed ? 'O' : 'X',
      l.message,
      l.timestamp
    ]);

    const wb = XLSX.utils.book_new();
    const wsLogs = XLSX.utils.aoa_to_sheet([headers, ...data]);

    XLSX.utils.book_append_sheet(wb, wsLogs, "게임 로그");

    XLSX.writeFile(wb, `좀비게임_결과_${new Date().toLocaleDateString()}.xlsx`);
  }, [logs]);

  const nextRound = React.useCallback(() => {
    addLog(`${currentRound}라운드 종료`, 'ROUND_END');
    
    setStudents(prev => {
      return prev.map(s => {
        let isZombie = s.isZombie;
        if (!s.touchedThisRound) {
          isZombie = true;
        }
        return { 
          ...s, 
          isZombie,
          infectedThisRound: false, 
          touchedThisRound: false 
        };
      });
    });

    const survivors = students.filter(s => !s.isZombie && !s.touchedThisRound);
    if (survivors.length > 0) {
      addLog(`활동 부족으로 인한 감염: ${survivors.map(s => s.name).join(', ')}`, 'INFECTION');
    }

    if (currentRound < config.totalRounds) {
      setCurrentRound(prev => prev + 1);
      setTimeLeft(config.roundTime);
      setIsTimerRunning(true);
    } else {
      setView('RESULTS');
    }
  }, [currentRound, addLog, config.totalRounds, config.roundTime, students]);

  // --- View Navigation Handlers ---
  const handleStart = React.useCallback(() => setView('SETUP_CONFIG'), []);
  const handleConfigNext = React.useCallback((newConfig: GameConfig) => {
    setConfig(newConfig);
    setView('SETUP_STUDENTS');
  }, []);
  const handleStudentsAdd = React.useCallback((names: string[]) => {
    const newStudents: Student[] = names.map(name => ({
      id: Math.random().toString(36).substr(2, 9),
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
    setStudents(prev => {
      const student = prev.find(s => s.id === id);
      if (student) {
        setConfirmCureId(student.id);
      }
      return prev;
    });
  }, []);
  const handleShowTeacherPage = React.useCallback(() => setShowTeacherPage(true), []);
  const handleCloseTeacherPage = React.useCallback(() => setShowTeacherPage(false), []);
  const handleConfirmCureCancel = React.useCallback(() => setConfirmCureId(null), []);
  const handleClearAll = React.useCallback(() => setStudents([]), []);

  // --- Timer Effect ---
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isTimerRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      setModal({ title: '라운드 종료', message: '시간이 모두 경과했습니다. 모든 행동이 중단됩니다.', type: 'info' });
    }
    return () => clearInterval(timer);
  }, [isTimerRunning, timeLeft]);

  // --- Views ---

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-purple-500/30">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-green-900/10 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 container mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {view === 'START' && <StartView key="start" onStart={handleStart} />}
          {view === 'SETUP_CONFIG' && (
            <SetupConfigView 
              key="setup-config" 
              config={config} 
              onNext={handleConfigNext} 
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
            />
          )}
          {view === 'SETUP_ZOMBIES' && (
            <SetupZombiesView 
              key="setup-zombies" 
              students={students}
              onToggleZombie={toggleZombie}
              onStart={startRound}
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
              config={config}
              confirmCureId={confirmCureId}
              onConfirmCureCancel={handleConfirmCureCancel}
              onConfirmCureAction={handleCure}
              showTeacherPage={showTeacherPage}
              onTeacherPageClose={handleCloseTeacherPage}
              logs={logs}
              onExport={exportToExcel}
            />
          )}
          {view === 'RESULTS' && (
            <ResultsView 
              key="results" 
              students={students}
              onExport={exportToExcel}
            />
          )}
        </AnimatePresence>
      </main>

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
                {modal.type === 'warning' && <AlertTriangle className="text-red-500" />}
                {modal.type === 'info' && <Zap className="text-blue-500" />}
                <h3 className="text-xl font-bold">{modal.title}</h3>
              </div>
              <p className="text-zinc-400 mb-6">{modal.message}</p>
              <Button className="w-full" onClick={() => setModal(null)}>확인</Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
