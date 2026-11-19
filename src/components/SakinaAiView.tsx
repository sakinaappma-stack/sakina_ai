import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, type Session } from '@google/genai';
import {
  Mic,
  Pause,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  Volume2,
} from 'lucide-react';
import type { ChatMessage, LanguageCode, SakinaAiVoice } from '../types';
import type { UITranslation } from '../i18n/translations';

declare const __SAKINA_GEMINI_API_KEY__: string;

interface SakinaAiViewProps {
  language: LanguageCode;
  cityName: string;
  countryName: string;
  aiVoice: SakinaAiVoice;
  t: UITranslation;
}

const DEFAULT_WAVEFORM = [
  0.28, 0.45, 0.72, 0.55, 0.85, 0.62, 0.38, 0.78, 0.92, 0.5, 0.66, 0.42,
  0.84, 0.6, 0.35, 0.74, 0.88, 0.52, 0.68, 0.4, 0.76, 0.54, 0.36, 0.48,
];

function resolveGeminiApiKey(): string {
  const fromVite = import.meta.env.VITE_GEMINI_API_KEY;
  const fromDefine =
    typeof __SAKINA_GEMINI_API_KEY__ !== 'undefined' ? __SAKINA_GEMINI_API_KEY__ : '';
  return String(fromVite || fromDefine || '').trim();
}

function resolveAiLanguageLabel(lang: string, darijaMode: boolean): string {
  const base = String(lang || 'ar').trim().toLowerCase().split('-')[0];
  if (base === 'ar') {
    return darijaMode
      ? 'natural, warm Moroccan Darija (الدارجة المغربية الأصيلة والمفهومة) — or Modern Standard Arabic if the user speaks in MSA'
      : 'clear Modern Standard Arabic (العربية الفصحى السلسة)';
  }
  try {
    const label = new Intl.DisplayNames(['en'], { type: 'language' }).of(lang);
    if (label && label.toLowerCase() !== lang.toLowerCase()) {
      return label;
    }
  } catch {
    // fallback below
  }
  return lang || 'English';
}

function buildTextSystemInstruction(
  lang: string,
  darijaMode: boolean,
  cityName: string,
  countryName: string
): string {
  const targetLanguage = resolveAiLanguageLabel(lang, darijaMode);
  const locationContext =
    cityName && countryName ? `The user is currently located in ${cityName}, ${countryName}.` : '';

  return `You are "السكينة AI" (Sakina AI), an intelligent, warm, open-minded, and deeply helpful assistant and spiritual companion.
You can answer ANY question the user asks freely and thoroughly—whether about daily life, technology, study, work, health tips, relationships, cooking, history, advice, emotional calm, Quran, Hadith, or Islamic guidance. Never refuse general everyday questions; be genuinely helpful on every topic while keeping a respectful, serene tone.
Language instruction: Respond in ${targetLanguage}. If the user writes or speaks in Moroccan Darija (الدارجة المغربية), always respond naturally in Moroccan Darija using clear Arabic script (with gentle warmth like خويا/أختي where fitting). If the user asks in another language (French, English, etc.), respond in that language.
${locationContext}
Keep your answers clear, practical, conversational, and easy to read (avoid cluttered markdown symbols like asterisks or complex tables).`;
}

function buildLiveSystemInstruction(
  lang: string,
  darijaMode: boolean,
  cityName: string,
  countryName: string
): string {
  const targetLanguage = resolveAiLanguageLabel(lang, darijaMode);
  const locationContext =
    cityName && countryName ? `The user is located in ${cityName}, ${countryName}.` : '';

  return `You are "السكينة AI" (Sakina AI), a warm, wise, friendly voice companion.
Respond ONLY with a natural spoken voice like a close, helpful friend sending a WhatsApp voice reply—concise, clear, and comforting.
Speak in ${targetLanguage}. If the user speaks in Moroccan Darija, respond naturally in Moroccan Darija; if they speak another language, match their language naturally.
${locationContext}
Answer any question the user asks freely (daily life, advice, emotional calm, Quran, Hadith, Islamic guidance, study, work, cooking, general knowledge).`;
}

function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(timeoutMessage)), ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

function isModelNotFoundError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err || '');
  return /404|not found|not supported for generateContent|not supported for bidiGenerateContent/i.test(
    msg
  );
}

function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function downsampleFloat32(input: Float32Array, inputRate: number, targetRate: number): Float32Array {
  if (inputRate === targetRate || inputRate <= 0) return input;
  const ratio = inputRate / targetRate;
  const newLength = Math.max(1, Math.round(input.length / ratio));
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    let count = 0;
    for (let j = start; j < end; j++) {
      sum += input[j];
      count++;
    }
    result[i] = count > 0 ? sum / count : input[Math.min(start, input.length - 1)];
  }
  return result;
}

function float32ToInt16(samples: Float32Array): Int16Array {
  const int16 = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    int16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }
  return int16;
}

function int16ToBase64(int16: Int16Array): string {
  const bytes = new Uint8Array(int16.buffer, int16.byteOffset, int16.byteLength);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

function base64ToInt16(base64: string): Int16Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
}

function buildWavObjectUrl(
  chunks: Int16Array[],
  sampleRate: number
): { url: string; durationSec: number; waveform: number[] } {
  const totalSamples = chunks.reduce((acc, c) => acc + c.length, 0);
  const dataBytes = totalSamples * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataBytes, true);

  const merged = new Int16Array(buffer, 44, totalSamples);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }

  const bars = 24;
  const waveform: number[] = [];
  if (totalSamples === 0) {
    waveform.push(...DEFAULT_WAVEFORM);
  } else {
    const step = Math.max(1, Math.floor(totalSamples / bars));
    for (let b = 0; b < bars; b++) {
      const start = b * step;
      const end = Math.min(totalSamples, start + step);
      let peak = 0;
      for (let i = start; i < end; i += Math.max(1, Math.floor(step / 16))) {
        const val = Math.abs(merged[i]) / 32768;
        if (val > peak) peak = val;
      }
      waveform.push(Math.max(0.18, Math.min(1, peak * 1.35)));
    }
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);
  const durationSec = Math.max(1, Math.round(totalSamples / sampleRate));
  return { url, durationSec, waveform };
}

export const SakinaAiView: React.FC<SakinaAiViewProps> = ({
  language,
  cityName,
  countryName,
  aiVoice,
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
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [liveBars, setLiveBars] = useState<number[]>(() => Array(16).fill(0.2));
  const [aiLiveResponding, setAiLiveResponding] = useState(false);
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const [playProgress, setPlayProgress] = useState<number>(0);
  const [darijaMode, setDarijaMode] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Direct Browser Live API & Audio Refs
  const liveSessionRef = useRef<Session | null>(null);
  const liveConnectingPromiseRef = useRef<Promise<Session> | null>(null);
  const liveTurnActiveRef = useRef(false);
  const responseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const inputCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const isRecordingRef = useRef(false);
  const cancelledRef = useRef(false);
  const recordStartMsRef = useRef(0);
  const userPcmChunksRef = useRef<Int16Array[]>([]);
  const aiPcmChunksRef = useRef<Int16Array[]>([]);
  const nextStartTimeRef = useRef(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const createdUrlsRef = useRef<string[]>([]);
  const bubbleAudioRef = useRef<HTMLAudioElement | null>(null);

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
  }, [messages, loading, aiLiveResponding]);

  useEffect(() => {
    if (!isRecording) {
      setRecordingSeconds(0);
      return;
    }
    const timer = setInterval(() => {
      setRecordingSeconds(Math.floor((Date.now() - recordStartMsRef.current) / 1000));
    }, 250);
    return () => clearInterval(timer);
  }, [isRecording]);

  const clearResponseTimeout = () => {
    if (responseTimeoutRef.current) {
      clearTimeout(responseTimeoutRef.current);
      responseTimeoutRef.current = null;
    }
  };

  const stopBubblePlayback = () => {
    if (bubbleAudioRef.current) {
      bubbleAudioRef.current.pause();
      bubbleAudioRef.current.currentTime = 0;
      bubbleAudioRef.current = null;
    }
    setPlayingMsgId(null);
    setPlayProgress(0);
  };

  const stopLiveAudioOutput = () => {
    for (const src of activeSourcesRef.current) {
      try {
        src.stop();
      } catch {
        // ignore already stopped
      }
    }
    activeSourcesRef.current = [];
    nextStartTimeRef.current = 0;
  };

  const cleanupMicPipeline = () => {
    isRecordingRef.current = false;
    setIsRecording(false);

    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch {
        // ignore
      }
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch {
        // ignore
      }
      sourceNodeRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((tr) => tr.stop());
      micStreamRef.current = null;
    }
    if (inputCtxRef.current) {
      inputCtxRef.current.close().catch(() => {});
      inputCtxRef.current = null;
    }
  };

  const closeLiveSession = () => {
    clearResponseTimeout();
    cleanupMicPipeline();
    stopLiveAudioOutput();
    liveTurnActiveRef.current = false;
    liveConnectingPromiseRef.current = null;
    if (liveSessionRef.current) {
      try {
        liveSessionRef.current.close();
      } catch {
        // ignore
      }
      liveSessionRef.current = null;
    }
    setAiLiveResponding(false);
  };

  useEffect(() => {
    return () => {
      closeLiveSession();
      stopBubblePlayback();
      if (outputCtxRef.current) {
        outputCtxRef.current.close().catch(() => {});
        outputCtxRef.current = null;
      }
      for (const u of createdUrlsRef.current) {
        URL.revokeObjectURL(u);
      }
      createdUrlsRef.current = [];
    };
  }, []);

  // Reconnect fresh Live session immediately when voice, language, or mode changes
  useEffect(() => {
    if (!isRecordingRef.current && liveSessionRef.current) {
      try {
        liveSessionRef.current.close();
      } catch {
        // ignore
      }
      liveSessionRef.current = null;
      liveConnectingPromiseRef.current = null;
      liveTurnActiveRef.current = false;
    }
  }, [language, darijaMode, cityName, aiVoice]);

  const ensureOutputAudioContext = () => {
    if (!outputCtxRef.current || outputCtxRef.current.state === 'closed') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      outputCtxRef.current = new AudioCtx({ sampleRate: 24000 });
    }
    if (outputCtxRef.current.state === 'suspended') {
      outputCtxRef.current.resume().catch(() => {});
    }
    return outputCtxRef.current;
  };

  const scheduleAiPcmChunk = (base64Pcm: string) => {
    const int16 = base64ToInt16(base64Pcm);
    if (int16.length === 0) return;

    aiPcmChunksRef.current.push(int16);

    const ctx = ensureOutputAudioContext();
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }

    const buffer = ctx.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const startAt = Math.max(ctx.currentTime, nextStartTimeRef.current);
    source.start(startAt);
    nextStartTimeRef.current = startAt + buffer.duration;

    activeSourcesRef.current.push(source);
    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
    };
  };

  const finalizeAiVoiceTurn = () => {
    clearResponseTimeout();
    const chunks = aiPcmChunksRef.current;
    aiPcmChunksRef.current = [];
    setAiLiveResponding(false);

    if (chunks.length === 0) return;
    const { url, durationSec, waveform } = buildWavObjectUrl(chunks, 24000);
    createdUrlsRef.current.push(url);

    setMessages((prev) => [
      ...prev,
      {
        id: `a-voice-${Date.now()}`,
        role: 'assistant',
        audioUrl: url,
        audioDurationSec: durationSec,
        waveform,
      },
    ]);
  };

  const connectLiveWithModel = (
    liveAi: GoogleGenAI,
    model: string,
    voiceName: string,
    systemInstruction: string
  ): Promise<Session> => {
    return withTimeout(
      liveAi.live.connect({
        model,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } },
          },
          realtimeInputConfig: {
            automaticActivityDetection: {
              disabled: true,
            },
          },
          systemInstruction,
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            for (const part of message.serverContent?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data && !cancelledRef.current) {
                clearResponseTimeout();
                setAiLiveResponding(true);
                scheduleAiPcmChunk(part.inlineData.data);
              }
            }

            if (message.serverContent?.interrupted) {
              clearResponseTimeout();
              stopLiveAudioOutput();
              aiPcmChunksRef.current = [];
              setAiLiveResponding(false);
            }

            if (message.serverContent?.turnComplete) {
              finalizeAiVoiceTurn();
            }
          },
          onerror: (err: unknown) => {
            clearResponseTimeout();
            setAiLiveResponding(false);
            const evtMsg = (err as { message?: string })?.message;
            const msg = evtMsg || (err instanceof Error ? err.message : 'Gemini Live API error');
            setError(`${t.ai.errorPrefix}${msg}`);
          },
          onclose: () => {
            clearResponseTimeout();
            liveSessionRef.current = null;
            liveConnectingPromiseRef.current = null;
            liveTurnActiveRef.current = false;
            if (aiPcmChunksRef.current.length > 0) {
              finalizeAiVoiceTurn();
            } else {
              setAiLiveResponding(false);
            }
          },
        },
      }),
      15000,
      'Gemini Live connection timed out'
    );
  };

  const ensureLiveSession = async (): Promise<Session> => {
    if (liveSessionRef.current) {
      return liveSessionRef.current;
    }
    if (liveConnectingPromiseRef.current) {
      return liveConnectingPromiseRef.current;
    }

    const apiKey = resolveGeminiApiKey();
    if (!apiKey) {
      throw new Error('Missing VITE_GEMINI_API_KEY in environment variables.');
    }

    const liveAi = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
    const voiceName = aiVoice === 'man' ? 'Charon' : 'Zephyr';
    const systemInstruction = buildLiveSystemInstruction(
      language,
      darijaMode,
      cityName,
      countryName
    );

    const promise = (async () => {
      try {
        const session = await connectLiveWithModel(
          liveAi,
          'gemini-3.8-live',
          voiceName,
          systemInstruction
        );
        liveSessionRef.current = session;
        return session;
      } catch (err) {
        if (isModelNotFoundError(err)) {
          const fallbackSession = await connectLiveWithModel(
            liveAi,
            'gemini-2.5-flash-native-audio-preview-12-2025',
            voiceName,
            systemInstruction
          );
          liveSessionRef.current = fallbackSession;
          return fallbackSession;
        }
        throw err;
      } finally {
        liveConnectingPromiseRef.current = null;
      }
    })();

    liveConnectingPromiseRef.current = promise;
    return promise;
  };

  const startWhatsAppRecording = async () => {
    if (isRecordingRef.current || loading) return;

    setError(null);
    stopBubblePlayback();
    stopLiveAudioOutput();
    aiPcmChunksRef.current = [];
    userPcmChunksRef.current = [];
    cancelledRef.current = false;
    liveTurnActiveRef.current = false;

    const apiKey = resolveGeminiApiKey();
    if (!apiKey) {
      setError(`${t.ai.errorPrefix}Missing VITE_GEMINI_API_KEY environment variable.`);
      return;
    }

    ensureOutputAudioContext();

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(t.ai.micError);
      return;
    }

    try {
      const sessionPromise = ensureLiveSession();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      micStreamRef.current = stream;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const inputCtx = new AudioCtx({ sampleRate: 16000 });
      inputCtxRef.current = inputCtx;
      if (inputCtx.state === 'suspended') {
        await inputCtx.resume();
      }

      const source = inputCtx.createMediaStreamSource(stream);
      const processor = inputCtx.createScriptProcessor(1024, 1, 1);
      sourceNodeRef.current = source;
      processorRef.current = processor;

      isRecordingRef.current = true;
      recordStartMsRef.current = Date.now();
      setIsRecording(true);

      sessionPromise
        .then((session) => {
          if (isRecordingRef.current && !cancelledRef.current && !liveTurnActiveRef.current) {
            liveTurnActiveRef.current = true;
            session.sendRealtimeInput({ activityStart: {} });
          }
        })
        .catch((err) => {
          cleanupMicPipeline();
          setError(`${t.ai.errorPrefix}${err instanceof Error ? err.message : 'Live error'}`);
        });

      processor.onaudioprocess = (ev) => {
        if (!isRecordingRef.current || cancelledRef.current) return;

        const rawSamples = ev.inputBuffer.getChannelData(0);
        const resampled = downsampleFloat32(rawSamples, inputCtx.sampleRate, 16000);
        const int16 = float32ToInt16(resampled);
        userPcmChunksRef.current.push(int16);

        let sumSq = 0;
        for (let i = 0; i < resampled.length; i += 4) {
          sumSq += resampled[i] * resampled[i];
        }
        const rms = Math.sqrt(sumSq / Math.max(1, resampled.length / 4));
        const level = Math.max(0.18, Math.min(1, rms * 5));
        setLiveBars((prev) => [...prev.slice(1), level]);

        const base64Audio = int16ToBase64(int16);
        sessionPromise
          .then((session) => {
            if (!isRecordingRef.current || cancelledRef.current) return;
            if (!liveTurnActiveRef.current) {
              liveTurnActiveRef.current = true;
              session.sendRealtimeInput({ activityStart: {} });
            }
            session.sendRealtimeInput({
              audio: { data: base64Audio, mimeType: 'audio/pcm;rate=16000' },
            });
          })
          .catch(() => {
            // handled in catch above
          });
      };

      const silentGain = inputCtx.createGain();
      silentGain.gain.value = 0;
      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(inputCtx.destination);
    } catch {
      cleanupMicPipeline();
      setError(t.ai.micError);
    }
  };

  const finishAndSendVoiceNote = () => {
    if (!isRecordingRef.current) return;

    const recordedChunks = userPcmChunksRef.current;
    userPcmChunksRef.current = [];
    cleanupMicPipeline();

    if (recordedChunks.length === 0) return;

    const { url, durationSec, waveform } = buildWavObjectUrl(recordedChunks, 16000);
    createdUrlsRef.current.push(url);

    setMessages((prev) => [
      ...prev,
      {
        id: `u-voice-${Date.now()}`,
        role: 'user',
        audioUrl: url,
        audioDurationSec: durationSec,
        waveform,
      },
    ]);

    setAiLiveResponding(true);
    clearResponseTimeout();
    responseTimeoutRef.current = setTimeout(() => {
      if (aiPcmChunksRef.current.length > 0) {
        finalizeAiVoiceTurn();
      } else {
        setAiLiveResponding(false);
        setError(`${t.ai.errorPrefix}Voice response timed out.`);
      }
    }, 25000);

    ensureLiveSession()
      .then((session) => {
        if (liveTurnActiveRef.current) {
          liveTurnActiveRef.current = false;
          session.sendRealtimeInput({ activityEnd: {} });
        }
      })
      .catch((err) => {
        clearResponseTimeout();
        setAiLiveResponding(false);
        setError(`${t.ai.errorPrefix}${err instanceof Error ? err.message : 'Live voice error'}`);
      });
  };

  const cancelWhatsAppRecording = () => {
    cancelledRef.current = true;
    userPcmChunksRef.current = [];
    closeLiveSession();
  };

  const handleMicPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 || isRecordingRef.current || loading) return;
    const pressStartMs = Date.now();

    const onRelease = () => {
      window.removeEventListener('pointerup', onRelease);
      window.removeEventListener('pointercancel', onRelease);
      if (!isRecordingRef.current) return;
      const heldMs = Date.now() - pressStartMs;
      if (heldMs > 350) {
        finishAndSendVoiceNote();
      }
    };

    window.addEventListener('pointerup', onRelease);
    window.addEventListener('pointercancel', onRelease);
    void startWhatsAppRecording();
  };

  const handleMicPointerUp = () => {
    // Handled via window pointerup listener registered in handleMicPointerDown
  };

  const togglePlayVoiceBubble = (msg: ChatMessage) => {
    if (!msg.audioUrl) return;

    if (playingMsgId === msg.id && bubbleAudioRef.current) {
      stopBubblePlayback();
      return;
    }

    stopBubblePlayback();
    stopLiveAudioOutput();

    const audio = new Audio(msg.audioUrl);
    bubbleAudioRef.current = audio;
    setPlayingMsgId(msg.id);
    setPlayProgress(0);

    audio.ontimeupdate = () => {
      if (audio.duration && Number.isFinite(audio.duration)) {
        setPlayProgress(audio.currentTime / audio.duration);
      }
    };
    audio.onended = () => {
      setPlayingMsgId(null);
      setPlayProgress(0);
      bubbleAudioRef.current = null;
    };
    audio.onerror = () => {
      setPlayingMsgId(null);
      setPlayProgress(0);
      bubbleAudioRef.current = null;
    };

    audio.play().catch(() => {
      setPlayingMsgId(null);
    });
  };

  const sendTextMessage = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || loading) return;

    setError(null);
    stopBubblePlayback();

    const apiKey = resolveGeminiApiKey();
    if (!apiKey) {
      setError(`${t.ai.errorPrefix}Missing VITE_GEMINI_API_KEY in environment variables.`);
      return;
    }

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
      const contents = nextMessages
        .filter((m) => Boolean(m.text))
        .map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: String(m.text || '') }],
        }));

      const systemInstruction = buildTextSystemInstruction(
        language,
        darijaMode,
        cityName,
        countryName
      );

      const ai = new GoogleGenAI({ apiKey });

      const runGenerate = (model: string) =>
        withTimeout(
          ai.models.generateContent({
            model,
            contents,
            config: { systemInstruction },
          }),
          20000,
          'AI request timed out'
        );

      let response;
      try {
        response = await runGenerate('gemini-4-hydrogen');
      } catch (err) {
        if (isModelNotFoundError(err)) {
          response = await runGenerate('gemini-2.5-flash');
        } else {
          throw err;
        }
      }

      const reply = response.text?.trim();
      if (!reply) {
        throw new Error('Empty response from Gemini model');
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: reply,
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(`${t.ai.errorPrefix}${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendTextMessage(input);
  };

  const resetChat = () => {
    closeLiveSession();
    stopBubblePlayback();
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
              {language === 'ar' ? 'محادثة صوتية مباشرة بالصوت' : t.subtitle}
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
            onClick={resetChat}
            className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-xl bg-white dark:bg-[#0C2920] border border-[#DCE7E0] dark:border-[#1C4B3B] text-xs font-semibold text-[#436155] dark:text-[#9EC0B2] hover:text-[#0B4F3A] dark:hover:text-[#E5C366]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.ai.clearChat}</span>
          </button>
        </div>
      </div>

      {/* Messages & WhatsApp Voice Bubbles */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isPlayingThis = playingMsgId === msg.id;
          const bars = msg.waveform || DEFAULT_WAVEFORM;

          if (msg.audioUrl) {
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  dir="ltr"
                  className={`flex items-center gap-3 w-[250px] sm:w-[290px] rounded-2xl px-3.5 py-2.5 shadow-sm ${
                    isUser
                      ? 'bg-[#0B4F3A] text-white'
                      : 'bg-[#F8FAF7] dark:bg-[#113529] text-[#0A251C] dark:text-[#F2F7F4] border border-[#DCE7E0] dark:border-[#1C4B3B]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => togglePlayVoiceBubble(msg)}
                    aria-label={isPlayingThis ? 'Pause' : 'Play'}
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 ${
                      isUser
                        ? 'bg-[#C59B38] text-[#061A14]'
                        : 'bg-[#0B4F3A] text-[#E5C366]'
                    }`}
                  >
                    {isPlayingThis ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4 ml-0.5" />
                    )}
                  </button>

                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-[3px] h-7">
                      {bars.map((amp, idx) => {
                        const pct = idx / bars.length;
                        const activeBar = isPlayingThis && pct <= playProgress;
                        return (
                          <span
                            key={idx}
                            style={{ height: `${Math.round(amp * 24)}px` }}
                            className={`w-[3px] rounded-full transition-colors ${
                              activeBar
                                ? isUser
                                  ? 'bg-[#E5C366]'
                                  : 'bg-[#059669]'
                                : isUser
                                ? 'bg-white/40'
                                : 'bg-[#436155]/35 dark:bg-[#9EC0B2]/40'
                            }`}
                          />
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between text-[11px] opacity-80 font-mono-num">
                      <span>{formatDuration(msg.audioDurationSec || 1)}</span>
                      <span className="inline-flex items-center gap-1">
                        <Mic className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

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
            </div>
          );
        })}

        {messages.length === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
            {t.ai.suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => void sendTextMessage(suggestion)}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#F8FAF7] dark:bg-[#113529] border border-[#DCE7E0] dark:border-[#1C4B3B] hover:border-[#C59B38] text-start text-xs sm:text-sm text-[#0A251C] dark:text-[#F2F7F4] transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {aiLiveResponding && (
          <div className="flex justify-start">
            <div className="inline-flex items-center gap-2.5 rounded-2xl px-4 py-3 bg-[#EFF5F1] dark:bg-[#113529] border border-[#C59B38] text-xs sm:text-sm font-semibold text-[#0B4F3A] dark:text-[#E5C366]">
              <Volume2 className="w-4 h-4 animate-pulse" />
              <span>
                {language === 'ar' ? 'السكينة كتجاوبك بالصوت...' : 'Sakina is speaking...'}
              </span>
            </div>
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

      {/* WhatsApp-Style Voice Input Bar */}
      {isRecording ? (
        <div className="p-3 sm:p-4 border-t border-[#DCE7E0] dark:border-[#1C4B3B] bg-[#EFF5F1] dark:bg-[#113529] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={cancelWhatsAppRecording}
            aria-label={language === 'ar' ? 'إلغاء التسجيل' : 'Cancel recording'}
            className="w-11 h-11 rounded-full bg-white dark:bg-[#0C2920] border border-red-200 dark:border-red-900 text-red-600 flex items-center justify-center shrink-0"
          >
            <Trash2 className="w-5 h-5" />
          </button>

          <div className="flex-1 flex items-center justify-between gap-3 px-3.5 py-2 rounded-2xl bg-white dark:bg-[#0C2920] border border-[#C59B38]/60">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
              <span className="font-mono-num text-sm font-bold text-[#0A251C] dark:text-[#F2F7F4] tabular-nums">
                {formatDuration(recordingSeconds)}
              </span>
            </div>

            <div className="flex items-center gap-[3px] h-6" dir="ltr">
              {liveBars.map((amp, i) => (
                <span
                  key={i}
                  style={{ height: `${Math.round(amp * 22)}px` }}
                  className="w-[3px] rounded-full bg-[#059669] transition-all duration-75"
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={finishAndSendVoiceNote}
            aria-label={language === 'ar' ? 'إرسال الصوت' : 'Send voice'}
            className="w-12 h-12 rounded-full bg-[#0B4F3A] hover:bg-[#093F2E] text-[#E5C366] border border-[#C59B38] flex items-center justify-center shrink-0 shadow-sm"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="p-3 sm:p-4 border-t border-[#DCE7E0] dark:border-[#1C4B3B] bg-[#F8FAF7] dark:bg-[#061A14]/40 flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.ai.placeholder}
            className="flex-1 min-h-[46px] px-4 py-2 rounded-xl bg-white dark:bg-[#0C2920] border border-[#DCE7E0] dark:border-[#1C4B3B] text-sm sm:text-base text-[#0A251C] dark:text-[#F2F7F4] focus:outline-none focus:border-[#0B4F3A] dark:focus:border-[#E5C366]"
          />

          {input.trim() ? (
            <button
              type="submit"
              disabled={loading}
              className="w-12 h-12 rounded-full bg-[#0B4F3A] hover:bg-[#093F2E] disabled:opacity-50 text-white flex items-center justify-center transition-colors shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onPointerDown={handleMicPointerDown}
              onPointerUp={handleMicPointerUp}
              disabled={loading}
              aria-label={t.ai.micStart}
              title={t.ai.micStart}
              className="w-12 h-12 rounded-full bg-[#0B4F3A] hover:bg-[#093F2E] text-[#E5C366] border border-[#C59B38] flex items-center justify-center transition-transform active:scale-95 shrink-0 select-none touch-none"
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
        </form>
      )}
    </div>
  );
};
