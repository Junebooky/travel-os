'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTravel } from '@/context/TravelContext';
import { t } from '@/lib/i18n';
import { ChatMessage } from '@/types/travel';
import {
  Mic,
  MicOff,
  Volume2,
  X,
  ArrowRightLeft,
  Trash2,
  Send,
  AlertCircle,
  Edit2,
  Check,
} from 'lucide-react';

interface VoiceChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Browser Web Speech Recognition interface declaration
interface IWindowSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onresult: ((e: { results: { [key: number]: { [key: number]: { transcript: string } } } }) => void) | null;
}

export default function VoiceChatModal({ isOpen, onClose }: VoiceChatModalProps) {
  const { country, targetLang, showToast } = useTravel();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeSpeaker, setActiveSpeaker] = useState<'me' | 'partner'>('me');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [interimText, setInterimText] = useState<string>('');
  const [manualText, setManualText] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isUnsupported, setIsUnsupported] = useState<boolean>(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');

  const recognitionRef = useRef<IWindowSpeechRecognition | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, interimText, isTranslating]);

  // Translate and append to chat thread
  const processAndSendMessage = useCallback(
    async (text: string, speaker: 'me' | 'partner') => {
      if (!text.trim()) return;
      setIsTranslating(true);

      const sourceLang = speaker === 'me' ? 'ko' : targetLang;
      const destLang = speaker === 'me' ? targetLang : 'ko';

      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: text.trim(),
            sourceLang,
            targetLang: destLang,
          }),
        });

        const data = await res.json();
        const translatedText = data.success ? data.translation : text.trim();

        const newMsg: ChatMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          speaker,
          originalText: text.trim(),
          translatedText,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, newMsg]);
        setInterimText('');
        setManualText('');

        // Automatically play TTS for translated result
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(translatedText);
          utterance.lang = destLang === 'ja' ? 'ja-JP' : destLang === 'en' ? 'en-US' : destLang === 'vi' ? 'vi-VN' : 'ko-KR';
          utterance.onstart = () => setIsSpeaking(true);
          utterance.onend = () => setIsSpeaking(false);
          utterance.onerror = () => setIsSpeaking(false);
          window.speechSynthesis.speak(utterance);
        }

        // Switch turn to the other speaker for conversational flow
        setActiveSpeaker(speaker === 'me' ? 'partner' : 'me');
      } catch {
        showToast(t('common.error.service_unavailable'), 'error');
      } finally {
        setIsTranslating(false);
      }
    },
    [targetLang, showToast]
  );

  // Initialize Speech Recognition
  const startListening = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionClass =
      (window as unknown as { SpeechRecognition?: new () => IWindowSpeechRecognition }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => IWindowSpeechRecognition }).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setIsUnsupported(true);
      showToast(t('voice.unsupported'), 'info');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognitionClass();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = activeSpeaker === 'me' ? 'ko-KR' : targetLang === 'ja' ? 'ja-JP' : targetLang === 'vi' ? 'vi-VN' : 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setInterimText('');
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript || '';
        setInterimText(transcript);
      };

      recognition.onerror = (e) => {
        console.warn('[VoiceChat] Speech recognition error:', e);
        setIsListening(false);
        if (e.error === 'not-allowed') {
          showToast(t('voice.permission.denied'), 'error');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimText((finalText) => {
          if (finalText.trim()) {
            processAndSendMessage(finalText, activeSpeaker);
          }
          return '';
        });
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('[VoiceChat] Failed to start recognition:', err);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  // Play TTS on demand
  const handlePlayTTS = (text: string, lang: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'ja' ? 'ja-JP' : lang === 'en' ? 'en-US' : lang === 'vi' ? 'vi-VN' : 'ko-KR';
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  // Save edited message and re-translate
  const handleSaveEdit = async (msgId: string, speaker: 'me' | 'partner') => {
    if (!editingText.trim()) {
      setEditingMessageId(null);
      return;
    }

    const sourceLang = speaker === 'me' ? 'ko' : targetLang;
    const destLang = speaker === 'me' ? targetLang : 'ko';

    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: editingText.trim(),
          sourceLang,
          targetLang: destLang,
        }),
      });

      const data = await res.json();
      const updatedTranslated = data.success ? data.translation : editingText.trim();

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId ? { ...m, originalText: editingText.trim(), translatedText: updatedTranslated } : m
        )
      );
    } catch {
      // Keep existing
    } finally {
      setEditingMessageId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                {t('voice.title')}
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                  {country.flag} {country.name}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">{t('voice.desc')}</p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => setMessages([])}
                aria-label={t('voice.action.clear')}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.action.close')}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Speaker Turn Switcher Banner */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-950/40 border-b border-slate-800/80 text-xs">
          <button
            type="button"
            onClick={() => setActiveSpeaker('me')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-medium text-center transition-all ${
              activeSpeaker === 'me'
                ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('voice.speaker.me')}
          </button>
          <div className="px-2 text-slate-500">
            <ArrowRightLeft className="w-3.5 h-3.5" />
          </div>
          <button
            type="button"
            onClick={() => setActiveSpeaker('partner')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-medium text-center transition-all ${
              activeSpeaker === 'partner'
                ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('voice.speaker.partner')} ({targetLang.toUpperCase()})
          </button>
        </div>

        {/* Message Thread */}
        <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && !isListening && (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-800/60 flex items-center justify-center text-indigo-400 mb-1">
                <Mic className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-200">{t('voice.empty.title')}</p>
              <p className="text-xs text-slate-400 max-w-xs">{t('voice.empty.body')}</p>
            </div>
          )}

          {messages.map((msg) => {
            const isMe = msg.speaker === 'me';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
              >
                <span className="text-[10px] text-slate-400 px-1 font-mono">
                  {isMe ? t('voice.speaker.me') : t('voice.speaker.partner')}
                </span>

                <div
                  className={`p-3 rounded-2xl max-w-[85%] space-y-1.5 shadow-sm ${
                    isMe
                      ? 'bg-indigo-600/90 text-white rounded-tr-none'
                      : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700/60'
                  }`}
                >
                  {/* Original text & edit */}
                  {editingMessageId === msg.id ? (
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="text"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="w-full text-xs bg-black/40 px-2 py-1 rounded border border-white/20 text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(msg.id, msg.speaker)}
                        className="p-1 bg-white/20 rounded hover:bg-white/30"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs text-white/80 font-normal leading-relaxed">
                        {msg.originalText}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMessageId(msg.id);
                          setEditingText(msg.originalText);
                        }}
                        className="opacity-50 hover:opacity-100 text-white/60 p-0.5"
                        title={t('voice.action.edit')}
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Translated text */}
                  <div className="border-t border-white/10 pt-1 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold tracking-wide text-white leading-snug">
                      {msg.translatedText}
                    </p>
                    <button
                      type="button"
                      onClick={() => handlePlayTTS(msg.translatedText, isMe ? targetLang : 'ko')}
                      className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white shrink-0 transition-all"
                      title={t('translate.result.listen')}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Recognizing interim feedback */}
          {isListening && (
            <div className={`flex flex-col ${activeSpeaker === 'me' ? 'items-end' : 'items-start'} space-y-1`}>
              <div className="p-3 rounded-2xl max-w-[85%] bg-indigo-500/20 border border-indigo-400/40 text-indigo-200 animate-pulse text-xs">
                {interimText || t('voice.mic.listen')}
              </div>
            </div>
          )}

          {isTranslating && (
            <div className="flex items-center justify-center p-2 text-xs text-slate-400">
              <span className="animate-spin inline-block mr-1.5">⚡</span>
              {t('voice.status.translating')}
            </div>
          )}
        </div>

        {/* Bottom Interaction Controls */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex flex-col space-y-2">
          {/* Unsupported speech warning banner */}
          {isUnsupported && (
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-300 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{t('voice.unsupported')}</span>
            </div>
          )}

          {/* Main Big Voice Tap Button */}
          <div className="flex items-center justify-center relative">
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all transform active:scale-95 ${
                isListening
                  ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse ring-4 ring-rose-500/30'
                  : activeSpeaker === 'me'
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white ring-4 ring-indigo-500/20'
                  : 'bg-amber-600 hover:bg-amber-500 text-white ring-4 ring-amber-500/20'
              }`}
              aria-label={isListening ? t('voice.mic.stop') : t('voice.mic.tap_to_speak')}
            >
              {isListening ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
            </button>
            {isSpeaking && (
              <span className="absolute right-8 text-[11px] text-indigo-400 animate-bounce flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5" />
                음성 재생 중
              </span>
            )}
          </div>
          <p className="text-[11px] text-center text-slate-400">
            {isListening ? t('voice.mic.listen') : `${activeSpeaker === 'me' ? t('voice.speaker.me') : t('voice.speaker.partner')} ${t('voice.mic.tap_to_speak')}`}
          </p>

          {/* Text input fallback for environments without mic or noisy situations */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manualText.trim()) {
                processAndSendMessage(manualText, activeSpeaker);
              }
            }}
            className="flex items-center space-x-1.5 pt-1"
          >
            <input
              type="text"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder={`${activeSpeaker === 'me' ? '한국어' : targetLang.toUpperCase()} 직접 텍스트 입력…`}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={!manualText.trim() || isTranslating}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white rounded-xl text-xs font-medium flex items-center gap-1 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Medical / Emergency safety disclaimer */}
          <div className="flex items-start space-x-1 text-[10px] text-slate-500 leading-tight pt-1">
            <AlertCircle className="w-3 h-3 text-slate-500 shrink-0 mt-0.5" />
            <span>{t('voice.disclaimer')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
