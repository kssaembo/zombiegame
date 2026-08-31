import { playSound, playSynthSiren, stopSounds, disposeAudio } from '../audio/sound';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, CheckCircle2, Sparkles, AlertTriangle, X, Volume2, VolumeX, RotateCcw, FastForward } from 'lucide-react';

// Import local images from assets
import backBg from '../assets/images/bg_briefing_lab.webp';
import step1Img from '../assets/images/step1_img_1784754228525.jpg';
import step2Img from '../assets/images/step2_img_1784754243056.jpg';
import step3Img from '../assets/images/step3_img_1784754256753.jpg';
import step4Img from '../assets/images/step4_img_1784754271155.jpg';
import step5Img from '../assets/images/step5_img_1784754289654.jpg';
import step6Img from '../assets/images/step6_img_1784754303467.jpg';
import step7Img from '../assets/images/step7_img_1784754317297.jpg';
import step8Img from '../assets/images/step8_img_1784754335042.jpg';
import step9Img from '../assets/images/step9_img_1784754348090.jpg';
import step10Img from '../assets/images/step10_img_1784754362358.jpg';

interface IntroStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartGame: () => void;
}

interface StepConfig {
  chapterTitle: string;
  question: string;
  answer: string;
  image: string;
}

const STEPS_DATA: StepConfig[] = [
  {
    chapterTitle: "Chapter 1 : 생활 속 감염병을 찾아라",
    question: "병원체가 몸에 들어와 걸리는 질병이 있어요. 이걸 뭐라고 할까요?",
    answer: "감염병",
    image: step1Img,
  },
  {
    chapterTitle: "Chapter 2 : 생활 속 감염병",
    question: "생활 속에서 찾을 수 있는 감염병의 종류들에 대해 이야기해봐요.",
    answer: "감기, 독감, 파상풍, 식중독, 수족구병, 무좀, 코로나19",
    image: step2Img,
  },
  {
    chapterTitle: "Chapter 3 : 감염병이 위험한 이유",
    question: "ㄱㄹ되거나 학교에 가지 못하는 등 일상생활이 불편해져요.",
    answer: "격리",
    image: step3Img,
  },
  {
    chapterTitle: "Chapter 3 : 감염병이 위험한 이유",
    question: "몸이 아프고 ㅅㅁ이 위험할 수 있어요.",
    answer: "생명",
    image: step4Img,
  },
  {
    chapterTitle: "Chapter 3 : 감염병이 위험한 이유",
    question: "다른 사람에게 ㄱㅇㅂ을 옮길 수 있어요.",
    answer: "감염병",
    image: step5Img,
  },
  {
    chapterTitle: "Chapter 4 : 여러 가지 감염 과정",
    question: "기침이나 재채기 할 때 튀어나오는 작은 침방울을 통한 감염은?",
    answer: "비말을 통한 감염",
    image: step6Img,
  },
  {
    chapterTitle: "Chapter 4 : 여러 가지 감염 과정",
    question: "ㅁ이나 ㄱㄱ를 통해 감염될 수도 있어요.",
    answer: "물, 공기",
    image: step7Img,
  },
  {
    chapterTitle: "Chapter 4 : 여러 가지 감염 과정",
    question: "같은 음식을 여러 사람과 함께 나눠먹으면 ㅊ을 통한 감염이 될 수 있어요.",
    answer: "침",
    image: step8Img,
  },
  {
    chapterTitle: "Chapter 4 : 여러 가지 감염 과정",
    question: "여러 사람이 함께 사용하는 물건을 만져서 ㅈㅊ을 통한 감염이 될 수 있어요.",
    answer: "접촉",
    image: step9Img,
  },
  {
    chapterTitle: "Chapter 5 : 감염병 수칙을 잘 지켜서 건강한 생활을 해요!",
    question: "감염병 수칙을 잘 지켜서 건강한 생활을 해요!",
    answer: "올바른 손 씻기 & 마스크 착용 & 수칙 준수!",
    image: step10Img,
  },
];

export const IntroStoryModal: React.FC<IntroStoryModalProps> = ({
  isOpen,
  onClose,
  onStartGame,
}) => {
  // Mode: 'INTRO' (scrolling text) | 'QUIZ' (steps 1~10) | 'OUTRO' (dramatic warning)
  const [mode, setMode] = useState<'INTRO' | 'QUIZ' | 'OUTRO'>('INTRO');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);


  // Reset state when opening modal
  useEffect(() => {
    if (isOpen) {
      setMode('INTRO');
      setCurrentStepIndex(0);
      setShowAnswer(false);
      setTypedText('');
      setIsTyping(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !soundEnabled) disposeAudio();
    return disposeAudio;
  }, [isOpen, soundEnabled]);

  useEffect(() => {
    if (isOpen && mode === 'OUTRO' && soundEnabled) playSynthSiren(5000);
    return stopSounds;
  }, [isOpen, mode, soundEnabled]);

  // Handle Typewriter effect for Quiz questions
  useEffect(() => {
    if (isOpen && mode === 'QUIZ') {
      const currentConfig = STEPS_DATA[currentStepIndex];
      const targetText = currentConfig.question;
      
      setTypedText('');
      setIsTyping(true);
      setShowAnswer(false);

      let index = 0;
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);

      typingTimerRef.current = setInterval(() => {
        if (index < targetText.length) {
          const char = targetText.charAt(index);
          setTypedText((prev) => prev + char);
          if (soundEnabled && index % 2 === 0) {
            playSound('type');
          }
          index++;
        } else {
          setIsTyping(false);
          if (typingTimerRef.current) clearInterval(typingTimerRef.current);
        }
      }, 45);

      return () => {
        if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      };
    }
  }, [isOpen, mode, currentStepIndex, soundEnabled]);

  if (!isOpen) return null;

  const currentConfig = STEPS_DATA[currentStepIndex];
  const isStage10 = currentStepIndex === STEPS_DATA.length - 1;

  // Actions
  const handleConfirmAnswer = () => {
    if (soundEnabled) playSound('confirm');
    setShowAnswer(true);
  };

  const handleNextStep = () => {
    if (soundEnabled) playSound('next');
    if (currentStepIndex < STEPS_DATA.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      setShowAnswer(false);
    } else {
      // Transition to OUTRO ( 긴급 재난 문자 )
      setMode('OUTRO');
    }
  };

  const handleSkipTyping = () => {
    if (isTyping && currentConfig) {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      setTypedText(currentConfig.question);
      setIsTyping(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black text-white flex flex-col justify-between overflow-hidden select-none font-sans"
      >
        {/* Smooth Fade Background Layer without zooming animations */}
        <AnimatePresence mode="wait">
          <motion.div
            key={mode === 'QUIZ' ? `quiz-${currentStepIndex}` : mode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="absolute inset-0 bg-cover bg-center filter brightness-75 pointer-events-none"
            style={{ 
              backgroundImage: `url(${mode === 'QUIZ' ? currentConfig.image : backBg})` 
            }}
          />
        </AnimatePresence>

        {/* Global Dark Overlay */}
        <div className={`absolute inset-0 transition-colors duration-500 pointer-events-none ${
          mode === 'OUTRO' 
            ? 'bg-gradient-to-t from-red-950/90 via-black/80 to-black/90' 
            : showAnswer 
            ? 'bg-black/80 backdrop-blur-md' 
            : 'bg-gradient-to-t from-black/90 via-black/50 to-black/70'
        }`} />

        {/* Top Control Bar */}
        <div className="absolute top-4 right-4 z-[220] flex items-center gap-2 md:gap-3">
          <button
            onClick={onStartGame}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-purple-600/80 hover:bg-purple-600 border border-purple-400/50 text-white text-xs md:text-sm font-bold shadow-lg shadow-purple-500/30 hover:scale-105 active:scale-95 transition-all backdrop-blur-md"
            title="인터뷰/스토리 건너뛰고 바로 게임 시작"
          >
            <span>건너뛰기</span>
            <FastForward className="w-4 h-4" />
          </button>
          <button
            onClick={() => setSoundEnabled((prev) => !prev)}
            className="p-2.5 md:p-3 rounded-full bg-black/60 border border-white/20 text-zinc-300 hover:text-white hover:bg-black/80 transition-all backdrop-blur-md"
            title={soundEnabled ? "음소거" : "음성 켜기"}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5 text-green-400" /> : <VolumeX className="w-5 h-5 text-zinc-500" />}
          </button>
          <button
            onClick={onClose}
            className="p-2.5 md:p-3 rounded-full bg-black/60 border border-white/20 text-zinc-300 hover:text-white hover:bg-black/80 transition-all backdrop-blur-md"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* --- MODE 1: INTRO SCROLLING TEXT --- */}
        {mode === 'INTRO' && (
          <div className="relative w-full h-full flex flex-col items-center justify-between p-6 md:p-12 overflow-hidden z-10">
            {/* Header Badge */}
            <div className="pt-6 text-center">
              <span className="px-4 py-1.5 rounded-full bg-purple-950/80 border border-purple-500/50 text-purple-300 text-xs md:text-sm font-semibold tracking-wider uppercase shadow-lg shadow-purple-500/20">
                SCIENCE CLASS STORY INTRO
              </span>
            </div>

            {/* Scrolling Credits Text (Speed doubled: 8s) with Tension Font */}
            <div className="w-full max-w-2xl h-[55vh] overflow-hidden flex items-center justify-center my-auto">
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: '-10%' }}
                transition={{ duration: 8, ease: 'linear' }}
                className="flex flex-col items-center gap-8 text-center px-4 font-['Black_Han_Sans',sans-serif]"
              >
                <p className="text-3xl md:text-4xl text-purple-300 tracking-wide drop-shadow-md">
                  재미있는 과학 시간
                </p>
                <p className="text-2xl md:text-3xl text-zinc-200 tracking-wide">
                  감염병과 건강한 생활?
                </p>
                <p className="text-3xl md:text-4xl text-amber-300 tracking-wide drop-shadow-md">
                  감염병.. 감염병이 뭐지?
                </p>
                <p className="text-2xl md:text-3xl text-zinc-300 tracking-wide">
                  병원체? 비말? 접촉?
                </p>
                <p className="text-3xl md:text-4xl text-red-400 animate-pulse tracking-wide drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                  뭔가 위험해 보이는데?
                </p>
                <p className="text-4xl md:text-5xl text-green-400 tracking-tight drop-shadow-[0_0_25px_rgba(74,222,128,0.6)]">
                  감염병에 대해 알아야겠어!!
                </p>
              </motion.div>
            </div>

            {/* Bottom Controls */}
            <div className="pb-8 w-full max-w-md mx-auto flex flex-col items-center gap-3">
              <button
                onClick={() => {
                  if (soundEnabled) playSound('next');
                  setMode('QUIZ');
                }}
                className="w-full py-4 px-8 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-green-600 text-white text-xl font-black tracking-wide shadow-[0_0_30px_rgba(168,85,247,0.5)] hover:shadow-[0_0_45px_rgba(168,85,247,0.8)] hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 group"
              >
                다음 단계로 진행하기 <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {/* --- MODE 2: QUIZ STEPS (1~10) --- */}
        {mode === 'QUIZ' && currentConfig && (
          <div className="relative w-full h-full flex flex-col justify-between p-4 md:p-8 overflow-hidden z-10">
            {/* Header Stage Indicator */}
            <div className="flex items-center justify-between w-full max-w-5xl mx-auto pt-2 px-2">
              <div className="flex items-center gap-3">
                <span className="px-3.5 py-1 rounded-full bg-purple-950/80 border border-purple-500/60 text-purple-300 text-xs md:text-sm font-extrabold shadow-md">
                  {currentStepIndex + 1} / {STEPS_DATA.length} STAGE
                </span>
                {/* Hide chapter title on 10th stage as requested */}
                {!isStage10 && (
                  <span className="text-zinc-300 text-sm font-bold hidden sm:inline-block">
                    {currentConfig.chapterTitle}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {STEPS_DATA.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      idx === currentStepIndex
                        ? 'w-8 bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]'
                        : idx < currentStepIndex
                        ? 'w-2 bg-purple-500'
                        : 'w-2 bg-zinc-700'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Middle Content Area (Question View / Answer Popup Overlay) */}
            <div className="flex-1 flex items-center justify-center my-4 px-2">
              <AnimatePresence mode="wait">
                {/* Answer Popup State (Only for stages 1~9) */}
                {showAnswer && !isStage10 ? (
                  <motion.div
                    key="answer-popup"
                    initial={{ opacity: 0, scale: 0.9, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -15 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="w-full max-w-2xl bg-zinc-950/90 border-2 border-green-500/70 rounded-3xl p-6 md:p-10 text-center shadow-[0_0_60px_rgba(34,197,94,0.3)] backdrop-blur-2xl flex flex-col items-center gap-4"
                  >
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-950/80 border border-green-500/50 text-green-400 text-sm font-extrabold shadow-inner">
                      <CheckCircle2 className="w-5 h-5 text-green-400" /> 정답 확인
                    </div>
                    
                    <h3 className="text-zinc-400 text-base md:text-lg font-medium">
                      {currentConfig.question}
                    </h3>

                    {/* Answer text without quotes "" */}
                    <div className="my-2 py-4 px-6 w-full rounded-2xl bg-black/60 border border-green-500/30">
                      <p className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-300 via-emerald-400 to-teal-200 tracking-tight break-keep leading-tight drop-shadow-[0_0_20px_rgba(34,197,94,0.5)]">
                        {currentConfig.answer}
                      </p>
                    </div>

                    <p className="text-zinc-400 text-xs md:text-sm">
                      정답을 확인하셨나요? 아래 '다음' 버튼을 누르세요!
                    </p>
                  </motion.div>
                ) : (
                  /* Question Image & Main Card State */
                  <motion.div
                    key="question-card"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="w-full max-w-4xl flex flex-col items-center gap-4"
                  >
                    {/* Chapter Title Banner (Hidden on 10th stage) */}
                    {!isStage10 && (
                      <div className="px-5 py-2 rounded-xl bg-black/70 border border-purple-500/40 text-purple-200 font-extrabold text-base md:text-xl shadow-lg backdrop-blur-md text-center">
                        {currentConfig.chapterTitle}
                      </div>
                    )}

                    {/* Image Preview Box */}
                    <div className="relative w-full max-w-2xl h-[32vh] md:h-[42vh] rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl">
                      <img
                        src={currentConfig.image}
                        alt="Stage Image"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom Typewriter Box & Action Controls */}
            <div className="w-full max-w-4xl mx-auto pb-4 px-2">
              {!showAnswer && (
                <div 
                  onClick={handleSkipTyping}
                  className="w-full mb-4 p-4 md:p-6 rounded-2xl bg-black/80 border border-purple-500/50 backdrop-blur-xl shadow-xl min-h-[90px] md:min-h-[100px] flex items-center justify-center text-center cursor-pointer hover:border-purple-400 transition-colors relative group"
                  title="클릭 시 텍스트 즉시 전체 보기"
                >
                  <p className="text-xl md:text-2xl font-bold text-white leading-relaxed break-keep tracking-wide">
                    {typedText}
                    {isTyping && <span className="inline-block w-2.5 h-6 bg-green-400 ml-1.5 animate-pulse align-middle" />}
                  </p>
                  {isTyping && (
                    <span className="absolute bottom-2 right-3 text-[10px] text-zinc-500 group-hover:text-purple-300 transition-colors">
                      [클릭 시 텍스트 건너뛰기]
                    </span>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-4">
                {/* Stage 10 has NO 'Confirm Answer' button as requested */}
                {!showAnswer && !isStage10 ? (
                  <button
                    onClick={handleConfirmAnswer}
                    className="w-full max-w-md py-4 px-8 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xl font-black tracking-wide shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:shadow-[0_0_45px_rgba(34,197,94,0.7)] hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-6 h-6 text-yellow-300" /> 정답 확인하기
                  </button>
                ) : (
                  <button
                    onClick={handleNextStep}
                    className="w-full max-w-md py-4 px-8 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-800 text-white text-xl font-black tracking-wide shadow-[0_0_30px_rgba(168,85,247,0.5)] hover:shadow-[0_0_45px_rgba(168,85,247,0.8)] hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 group"
                  >
                    {isStage10 ? '최종 미션 완료!' : '다음 단계로 ▶'}
                    <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- MODE 3: OUTRO (EERIE DRAMATIC EMERGENCY ALERT & GAME START) --- */}
        {mode === 'OUTRO' && (
          <div className="relative w-full h-full flex flex-col items-center justify-between p-4 md:p-8 overflow-hidden z-10">
            {/* Header Alert Badge */}
            <div className="pt-4 text-center">
              <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-red-950/90 border-2 border-red-500/80 text-red-400 text-sm md:text-base font-black tracking-widest uppercase shadow-[0_0_25px_rgba(239,68,68,0.5)] animate-bounce font-['Black_Han_Sans',sans-serif]">
                <AlertTriangle className="w-5 h-5 text-red-500" /> 긴급 재난 경보 발령
              </span>
            </div>

            {/* Eerie Story Message Box (Compact layout, no overlap, sequential fade in) */}
            <div className="w-full max-w-lg bg-black/90 border-2 border-red-600/70 rounded-3xl p-5 md:p-8 my-auto text-center shadow-[0_0_50px_rgba(239,68,68,0.4)] backdrop-blur-2xl flex flex-col items-center gap-4 overflow-y-auto max-h-[68vh]">
              
              {/* Item 1 */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="text-zinc-400 text-base md:text-lg font-medium tracking-wide font-['Do_Hyeon',sans-serif]"
              >
                "접촉.. 접촉.."
              </motion.p>

              {/* Item 2 */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="text-amber-400/80 text-xs md:text-sm italic"
              >
                (지이잉 지이잉.. 📱)
              </motion.p>

              {/* Item 3 */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1, duration: 0.5 }}
                className="text-red-400 text-base md:text-lg font-bold font-['Do_Hyeon',sans-serif]"
              >
                재난 문자? 무슨 내용이지?
              </motion.p>

              {/* Item 4 */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 1.7, duration: 0.6 }}
                className="p-4 rounded-2xl bg-red-950/60 border border-red-500/50 text-left text-red-200 text-sm md:text-base leading-relaxed font-semibold space-y-1.5 w-full shadow-inner"
              >
                <p className="font-['Do_Hyeon',sans-serif] text-red-400 text-base">🚨 [긴급 재난 문자]</p>
                <p className="text-white font-bold text-base md:text-lg">
                  학교에 정체불명의 바이러스가 퍼지고 있습니다.
                </p>
                <p className="text-yellow-300 font-bold">
                  지금부터 바이러스에 감염된 사람과 접촉하지 마세요!
                </p>
              </motion.div>

              {/* Item 5 */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.4, duration: 0.5 }}
                className="text-xl md:text-2xl font-bold text-red-400 tracking-tight animate-pulse font-['Do_Hyeon',sans-serif]"
              >
                "바이러스...?"
              </motion.p>

              {/* Item 6 (With Line Breaks & Clean Tension Font) */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 3.0, duration: 0.6 }}
                className="pt-3 border-t border-zinc-800 w-full"
              >
                <p className="text-xl md:text-2xl font-bold text-purple-300 tracking-tight leading-snug font-['Do_Hyeon',sans-serif]">
                  지니어스 한 학급 놀이..<br />
                  <span className="text-green-400">바이러스 게임을 시작합니다.</span>
                </p>
              </motion.div>
            </div>

            {/* Final Game Start Button */}
            <div className="pb-6 w-full max-w-md mx-auto">
              <button
                onClick={() => {
                  if (soundEnabled) playSound('alert');
                  onStartGame();
                }}
                className="w-full py-4 md:py-5 px-8 rounded-2xl bg-gradient-to-r from-red-600 via-purple-600 to-green-600 text-white text-xl md:text-2xl font-bold tracking-tight shadow-[0_0_40px_rgba(239,68,68,0.7)] hover:shadow-[0_0_60px_rgba(239,68,68,0.9)] hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-3 group font-['Do_Hyeon',sans-serif]"
              >
                바이러스 게임 시작하기! <ChevronRight className="w-7 h-7 group-hover:translate-x-1.5 transition-transform" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
