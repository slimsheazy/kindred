
import React, { useEffect, useState, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { ScaleIcon } from './Icons';
import { UserData } from '../types';

interface ConflictNavigatorProps {
  userData: UserData | null;
  onClose: () => void;
}

// Manual encoding/decoding as per guidelines
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const ConflictNavigator: React.FC<ConflictNavigatorProps> = ({ userData, onClose }) => {
  const [isActive, setIsActive] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [volume, setVolume] = useState(0);
  
  const audioContexts = useRef<{ input?: AudioContext, output?: AudioContext }>({});
  const sessionRef = useRef<any>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const analyzerRef = useRef<AnalyserNode | null>(null);

  const startMediation = async () => {
    if (!process.env.API_KEY) return;
    setIsActive(true);

    const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    audioContexts.current = { input: inputCtx, output: outputCtx };

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      callbacks: {
        onopen: () => {
          const source = inputCtx.createMediaStreamSource(stream);
          const analyzer = inputCtx.createAnalyser();
          analyzer.fftSize = 256;
          analyzerRef.current = analyzer;
          source.connect(analyzer);

          const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
          scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            
            // Calculate real-time volume for visualizer
            let sum = 0;
            for (let i = 0; i < inputData.length; i++) {
              sum += inputData[i] * inputData[i];
            }
            setVolume(Math.sqrt(sum / inputData.length));

            const pcmBlob: Blob = {
              data: encode(new Uint8Array(new Int16Array(inputData.map(v => v * 32768)).buffer)),
              mimeType: 'audio/pcm;rate=16000',
            };
            sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
          };
          source.connect(scriptProcessor);
          scriptProcessor.connect(inputCtx.destination);
        },
        onmessage: async (message: LiveServerMessage) => {
          if (message.serverContent?.outputTranscription) {
            setTranscription(prev => (prev + ' ' + message.serverContent?.outputTranscription?.text).slice(-100));
          }

          const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (base64Audio) {
            setIsAiSpeaking(true);
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
            const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
            const source = outputCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputCtx.destination);
            source.addEventListener('ended', () => {
              sourcesRef.current.delete(source);
              if (sourcesRef.current.size === 0) setIsAiSpeaking(false);
            });
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
            sourcesRef.current.add(source);
          }

          if (message.serverContent?.interrupted) {
            sourcesRef.current.forEach(s => s.stop());
            sourcesRef.current.clear();
            nextStartTimeRef.current = 0;
            setIsAiSpeaking(false);
          }
        },
        onclose: () => setIsActive(false),
        onerror: (e) => console.error("Live API Error:", e),
      },
      config: {
        responseModalities: [Modality.AUDIO],
        outputAudioTranscription: {},
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }, // Warm, deep voice
        },
        systemInstruction: `You are a neutral, empathetic relationship mediator for ${userData?.userName} and ${userData?.partnerName}. 
        Your goal is to de-escalate conflict and improve communication. 
        Rules:
        1. Always use active listening (e.g., "I hear that you feel...").
        2. Suggest "I-statements" instead of accusations.
        3. Remain strictly neutral.
        4. Keep your responses brief and calming.
        5. If they are talking over each other, gently ask them to take turns.`,
      }
    });

    sessionRef.current = await sessionPromise;
  };

  const stopMediation = () => {
    if (sessionRef.current) sessionRef.current.close();
    if (audioContexts.current.input) audioContexts.current.input.close();
    if (audioContexts.current.output) audioContexts.current.output.close();
    onClose();
  };

  useEffect(() => {
    startMediation();
    return () => {
      if (sessionRef.current) sessionRef.current.close();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center p-6 animate-fade-in">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-blue-500/10 rounded-full blur-[120px] transition-all duration-1000 ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`} />
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-indigo-500/10 rounded-full blur-[100px] transition-all duration-700 delay-300 ${isAiSpeaking ? 'opacity-100 scale-110' : 'opacity-40 scale-100'}`} />
      </div>

      <div className="relative z-10 text-center w-full max-w-lg">
        <div className="mb-12">
            <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-white/20">
                <ScaleIcon className="w-8 h-8 text-blue-400" />
            </div>
            <h2 className="text-3xl font-light text-white tracking-tight">Mediation Mode</h2>
            <p className="text-blue-300/60 font-medium text-sm mt-2 uppercase tracking-widest">Conflict Navigator Active</p>
        </div>

        <div className="relative h-64 flex items-center justify-center mb-12">
            {/* The Orb */}
            <div className={`w-32 h-32 rounded-full transition-all duration-300 border-4 ${
                isAiSpeaking ? 'bg-blue-400 border-blue-300 scale-110 shadow-[0_0_50px_rgba(96,165,250,0.5)]' : 
                'bg-white/5 border-white/10 scale-100 shadow-inner'
            }`} style={{ transform: `scale(${1 + volume * 2})` }}>
                <div className="w-full h-full rounded-full animate-pulse bg-gradient-to-br from-white/10 to-transparent" />
            </div>
            
            {/* Pulsing rings */}
            <div className={`absolute w-40 h-40 rounded-full border border-white/10 transition-all duration-1000 ${isActive ? 'animate-ping opacity-20' : 'opacity-0'}`} />
        </div>

        <div className="min-h-[80px] px-8 py-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 mb-12">
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-2">Live Reflection</p>
            <p className="text-white/80 text-sm leading-relaxed italic">
                {transcription || "Listening for your hearts..."}
            </p>
        </div>

        <button 
            onClick={stopMediation}
            className="group relative px-10 py-4 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 rounded-full text-rose-200 font-bold transition-all hover:scale-105 active:scale-95"
        >
            End Session
        </button>
        
        <p className="text-white/20 text-[10px] mt-8 max-w-xs mx-auto">
            Your shared space is private. The AI mediator acts as a neutral observer to help you find common ground.
        </p>
      </div>
    </div>
  );
};

export default ConflictNavigator;
