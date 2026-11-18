import React, { useEffect, useRef, useState } from 'react';
import { Mic, RotateCcw, Send, Sparkles, Square, Volume2, VolumeX } from 'lucide-react';
import type { ChatMessage, LanguageCode } from '../types';
import type { UITranslation } from '../i18n/translations';

interface SakinaAiViewProps {
  language: LanguageCode;
  cityName: string;
  countryName: string;
  t: UITranslation;
}

interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<SpeechRecognitionResultItem>>;
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

const SPEECH_LANG_MAP: Record<LanguageCode, string> = {
  ar: 'ar-MA',
  en: 'en-US',
  fr: 'fr-FR',
  tr: 'tr-TR',
  ur: 'ur-PK',
  id: 'id-ID',
  es: 'es-ES',
};

export const SakinaAiView: React.FC<SakinaAiViewProps> = ({
  language,
  cityName,
  countryName,
  t,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: t.ai.welcome,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [darijaMode, setDarijaMode] = useState(true);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === 'welcome') {
        return [{ id: 'welcome', role: 'assistant', text: t.ai.welcome }];
      }
      return prev;
    });
  }, [t.ai.welcome]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stopAudioPlayback = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingMsgId(null);
  };

  const speakMessage = (msgId: string, text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    stopAudioPlayback();

    const cleanedText = text.replace(/[*#_`]/g, '').trim();
    if (!cleanedText) return;

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    const targetLang = SPEECH_LANG_MAP[language] || 'ar-MA';
    utterance.lang = targetLang;
    utterance.rate = 0.98;

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const langPrefix = targetLang.split('-')[0];
      const matchedVoice =
        voices.find((v) => v.lang.toLowerCase() === targetLang.toLowerCase()) ||
        voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }
    }

    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  const sendMessage = async (promptText: string, shouldSpeakReply = autoSpeak) => {
    const trimmed = promptText.trim();
    if (!trimmed || loading) return;

    setError(null);
    stopAudioPlayback();

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, text: m.text })),
          lang: language,
          darijaMode,
          cityName,
          countryName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Request failed');
      }

      const replyId = `a-${Date.now()}`;
      const replyText = String(data.reply || '');

      setMessages((prev) => [
        ...prev,
        {
          id: replyId,
          role: 'assistant',
          text: replyText,
        },
      ]);

      if (shouldSpeakReply && replyText) {
        speakMessage(replyId, replyText);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(`${t.ai.errorPrefix}${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const startRecording = () => {
    setError(null);
    stopAudioPlayback();

    const win = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };

    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setError(t.ai.micError);
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.lang = SPEECH_LANG_MAP[language] || 'ar-MA';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim() || '';
        setIsRecording(false);
        if (transcript) {
          sendMessage(transcript, true);
        }
      };

      recognition.onerror = () => {
        setIsRecording(false);
        setError(t.ai.micError);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      setIsRecording(true);
      recognition.start();
    } catch {
      setIsRecording(false);
      setError(t.ai.micError);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsRecording(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const resetChat = () => {
    stopAudioPlayback();
    setMessages([{ id: 'welcome', role: 'assistant', text: t.ai.welcome }]);
    setError(null);
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-10.5rem)] min-h-[480px] rounded-3xl bg-white dark:bg-[#0C2920] border border-[#DCE7E0] dark:border-[#1C4B3B] overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-5 py-3.5 border-b border-[#DCE7E0] dark:border-[#1C4B3B] flex flex-wrap items-center justify-between gap-2.5 bg-[#EFF5F1]/60 dark:bg-[#113529]/60">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#0B4F3A] text-[#E5C366] flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#0A251C] dark:text-[#F2F7F4]">
              {t.ai.title}
            </h2>
            <p className="text-xs text-[#436155] dark:text-[#9EC0B2]">
              {t.subtitle}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {language === 'ar' && (
            <button
              type="button"
              onClick={() => setDarijaMode((prev) => !prev)}
              className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                darijaMode
                  ? 'bg-[#0B4F3A] text-white border-[#C59B38]'
                  : 'bg-white dark:bg-[#0C2920] text-[#436155] dark:text-[#9EC0B2] border-[#DCE7E0] dark:border-[#1C4B3B]'
              }`}
            >
              {darijaMode ? t.ai.darijaLabel : t.ai.msaLabel}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (autoSpeak) stopAudioPlayback();
              setAutoSpeak((prev) => !prev);
            }}
            className={`inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
              autoSpeak
                ? 'bg-[#C59B38] text-[#061A14] border-transparent'
                : 'bg-white dark:bg-[#0C2920] text-[#436155] dark:text-[#9EC0B2] border-[#DCE7E0] dark:border-[#1C4B3B]'
            }`}
          >
            {autoSpeak ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{t.ai.autoSpeak}</span>
          </button>

          <button
            type="button"
            onClick={resetChat}
            className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-xl bg-white dark:bg-[#0C2920] border border-[#DCE7E0] dark:border-[#1C4B3B] text-xs font-semibold text-[#436155] dark:text-[#9EC0B2] hover:text-[#0B4F3A] dark:hover:text-[#E5C366]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.ai.clearChat}</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isSpeakingThis = speakingMsgId === msg.id;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-1.5`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm sm:text-base leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? 'bg-[#0B4F3A] text-white'
                    : 'bg-[#F8FAF7] dark:bg-[#113529] text-[#0A251C] dark:text-[#F2F7F4] border border-[#DCE7E0] dark:border-[#1C4B3B]'
                }`}
              >
                {msg.text}
              </div>

              {!isUser && (
                <button
                  type="button"
                  onClick={() =>
                    isSpeakingThis
                      ? stopAudioPlayback()
                      : speakMessage(msg.id, msg.text)
                  }
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-[#436155] dark:text-[#9EC0B2] hover:text-[#0B4F3A] dark:hover:text-[#E5C366] transition-colors"
                >
                  {isSpeakingThis ? (
                    <>
                      <VolumeX className="w-3.5 h-3.5 text-[#C59B38]" />
                      <span>{t.ai.stopSpeaking}</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-[#9A741E] dark:text-[#E5C366]" />
                      <span>{t.ai.speakReply}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}

        {messages.length === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
            {t.ai.suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => sendMessage(suggestion)}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#F8FAF7] dark:bg-[#113529] border border-[#DCE7E0] dark:border-[#1C4B3B] hover:border-[#C59B38] text-start text-xs sm:text-sm text-[#0A251C] dark:text-[#F2F7F4] transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-3 bg-[#F8FAF7] dark:bg-[#113529] border border-[#DCE7E0] dark:border-[#1C4B3B] text-sm text-[#436155] dark:text-[#9EC0B2]">
              {t.ai.thinking}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs sm:text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input Bar with Browser Web Speech API Microphone & Send */}
      <form
        onSubmit={handleSubmit}
        className="p-3 sm:p-4 border-t border-[#DCE7E0] dark:border-[#1C4B3B] bg-[#F8FAF7] dark:bg-[#061A14]/40 flex items-center gap-2"
      >
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={loading}
          aria-label={isRecording ? t.ai.micStop : t.ai.micStart}
          title={isRecording ? t.ai.micStop : t.ai.micStart}
          className={`min-h-[46px] min-w-[46px] px-3 rounded-xl flex items-center justify-center gap-1.5 font-semibold text-xs sm:text-sm transition-colors shrink-0 ${
            isRecording
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-[#EFF5F1] dark:bg-[#113529] hover:border-[#C59B38] text-[#0B4F3A] dark:text-[#E5C366] border border-[#DCE7E0] dark:border-[#1C4B3B]'
          }`}
        >
          {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-5 h-5" />}
          {isRecording && <span className="hidden sm:inline">{t.ai.micStop}</span>}
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isRecording ? t.ai.recording : t.ai.placeholder}
          disabled={isRecording}
          className="flex-1 min-h-[46px] px-4 py-2 rounded-xl bg-white dark:bg-[#0C2920] border border-[#DCE7E0] dark:border-[#1C4B3B] text-sm sm:text-base text-[#0A251C] dark:text-[#F2F7F4] focus:outline-none focus:border-[#0B4F3A] dark:focus:border-[#E5C366]"
        />

        <button
          type="submit"
          disabled={loading || isRecording || !input.trim()}
          className="min-h-[46px] px-4 sm:px-5 rounded-xl bg-[#0B4F3A] hover:bg-[#093F2E] disabled:opacity-50 text-white font-semibold text-sm inline-flex items-center gap-2 transition-colors shrink-0"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">{t.ai.send}</span>
        </button>
      </form>
    </div>
  );
};
