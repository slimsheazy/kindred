
import React, { useEffect, useState, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { UserData } from '../types';

interface ConflictNavigatorProps {
  userData: UserData | null;
  onClose: () => void;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}

const ConflictNavigator: React.FC<ConflictNavigatorProps> = ({ userData, onClose }) => {
  const [isActive, setIsActive] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [volume, setVolume] = useState(0);
  const audioContexts = useRef<{ input?: AudioContext, output?: AudioContext }>({});
  const sessionRef = useRef<any>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);

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
          const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
          scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            let sum = 0;
            for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
            setVolume(Math.sqrt(sum / inputData.length));
            const pcmBlob: Blob = { data: encode(new Uint8Array(new Int16Array(inputData.map(v => v * 32768)).buffer)), mimeType: 'audio/pcm;rate=16000' };
            sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
          };
          source.connect(scriptProcessor);
          scriptProcessor.connect(inputCtx.destination);
        },
        onmessage: async (message: LiveServerMessage) => {
          if (message.serverContent?.outputTranscription) setTranscription(t => (t + ' ' + message.serverContent?.outputTranscription?.text).slice(-150));
          const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (base64Audio) {
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
            const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
            const source = outputCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputCtx.destination);
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
            sourcesRef.current.add(source);
          }
        },
        onclose: () => setIsActive(false),
      },
      config: {
        responseModalities: [Modality.AUDIO],
        outputAudioTranscription: {},
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
        systemInstruction: `You are a neutral relationship mediator. Guide ${userData?.userName} and ${userData?.partnerName} calmly. Speak briefly.`,
      }
    });
    sessionRef.current = await sessionPromise;
  };

  useEffect(() => { startMediation(); return () => { if (sessionRef.current) sessionRef.current.close(); }; }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-[#FDFCF0] flex flex-col items-center justify-center p-6 animate-fade-in">
      <div className="text-center w-full max-w-lg">
        <h2 className="text-5xl font-light mb-4">Mediation.</h2>
        <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#262626]/30 mb-20 heading-font">Neutral Ground</p>
        
        <div className="relative h-48 flex items-center justify-center mb-24">
            <div className="w-1 h-1 bg-[#00FF41] rounded-full blur-xl animate-pulse" style={{transform: `scale(${1 + volume * 50})`, opacity: 0.4}} />
            <div className="text-4xl font-light italic text-[#262626]/10">Listening...</div>
        </div>

        <div className="mb-24 px-8">
            <p className="text-xl leading-relaxed text-[#262626] italic text-center font-light">
                {transcription || "The floor is yours."}
            </p>
        </div>

        <button onClick={() => { if (sessionRef.current) sessionRef.current.close(); onClose(); }} className="text-[10px] font-bold uppercase tracking-widest text-[#262626] border-b border-[#262626] pb-1 hover:opacity-50 transition-all heading-font">Dissolve Session</button>
      </div>
    </div>
  );
};

export default ConflictNavigator;
