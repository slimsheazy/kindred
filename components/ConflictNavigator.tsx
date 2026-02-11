
import React, { useEffect, useState, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob, Type, FunctionDeclaration } from '@google/genai';
import { UserData } from '../types';

interface ConflictNavigatorProps {
  userData: UserData | null;
  onClose: () => void;
}

// SDK utility functions
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
  const [phase, setPhase] = useState<'grounding' | 'mediation' | 'intervention'>('grounding');
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
  const [transcription, setTranscription] = useState('');
  const [stability, setStability] = useState(1); // 0 to 1, lower is higher tension
  const [volume, setVolume] = useState(0);

  const audioContexts = useRef<{ input?: AudioContext, output?: AudioContext }>({});
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const ambientMusicRef = useRef<{ nodes: any[], ctx: AudioContext | null }>({ nodes: [], ctx: null });

  // Function declarations for the AI to control the UI
  const setMediationState: FunctionDeclaration = {
    name: 'setMediationState',
    parameters: {
      type: Type.OBJECT,
      properties: {
        newPhase: { type: Type.STRING, enum: ['grounding', 'mediation', 'intervention'], description: 'The current phase of conflict resolution.' },
        speakerName: { type: Type.STRING, description: 'The name of the user whose turn it is to speak.' },
        tensionLevel: { type: Type.NUMBER, description: 'Current perceived tension level from 0 to 1.' }
      },
      required: ['newPhase']
    },
  };

  const startAmbientMusic = (ctx: AudioContext) => {
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 5);
    masterGain.connect(ctx.destination);

    const freqs = [110, 164.81, 220, 277.18]; // A major sus2
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      g.gain.value = 0.04 / freqs.length;
      osc.connect(g);
      g.connect(masterGain);
      osc.start();
      ambientMusicRef.current.nodes.push(osc, g);
    });
    ambientMusicRef.current.nodes.push(masterGain);
  };

  const stopAmbientMusic = () => {
    ambientMusicRef.current.nodes.forEach(n => {
      try { n.stop(); } catch(e) {}
      try { n.disconnect(); } catch(e) {}
    });
    ambientMusicRef.current.nodes = [];
  };

  const startMediation = async () => {
    if (!process.env.API_KEY) return;
    setIsActive(true);
    
    const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    audioContexts.current = { input: inputCtx, output: outputCtx };
    
    startAmbientMusic(outputCtx);
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
            const vol = Math.sqrt(sum / inputData.length);
            setVolume(vol);

            const pcmBlob: Blob = { 
                data: encode(new Uint8Array(new Int16Array(inputData.map(v => v * 32768)).buffer)), 
                mimeType: 'audio/pcm;rate=16000' 
            };
            sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
          };
          source.connect(scriptProcessor);
          scriptProcessor.connect(inputCtx.destination);
        },
        onmessage: async (message: LiveServerMessage) => {
          if (message.toolCall?.functionCalls) {
            for (const fc of message.toolCall.functionCalls) {
              if (fc.name === 'setMediationState') {
                const { newPhase, speakerName, tensionLevel } = fc.args as any;
                if (newPhase) setPhase(newPhase);
                if (speakerName !== undefined) setActiveSpeaker(speakerName);
                if (tensionLevel !== undefined) setStability(1 - tensionLevel);
                
                sessionPromise.then(s => s.sendToolResponse({
                  functionResponses: { id: fc.id, name: fc.name, response: { result: 'ok' } }
                }));
              }
            }
          }

          if (message.serverContent?.outputTranscription) {
              setTranscription(t => (t + ' ' + message.serverContent?.outputTranscription?.text).slice(-150));
          }

          const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
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

          if (message.serverContent?.interrupted) {
            for (const s of sourcesRef.current) { s.stop(); }
            sourcesRef.current.clear();
            nextStartTimeRef.current = 0;
          }
        },
        onerror: (e) => console.error("Session error:", e),
      },
      config: {
        responseModalities: [Modality.AUDIO],
        outputAudioTranscription: {},
        tools: [{ functionDeclarations: [setMediationState] }],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        systemInstruction: `
          You are Kindred, a master conflict mediator. You use the "Speaker-Listener Technique."
          
          PHASES OF MEDIATION:
          1. GROUNDING: Start with a 30s calm guided breath. Use setMediationState(newPhase='grounding').
          2. MEDIATION: One partner speaks, one listens. Use setMediationState(newPhase='mediation', speakerName='Name').
          3. INTERVENTION: If voices are raised or tone is aggressive, trigger setMediationState(newPhase='intervention').
          
          RULES:
          - The Speaker holds the "floor." They must use "I" statements.
          - The Listener is forbidden from defending or responding. They MUST paraphrase the Speaker's feelings first.
          - You MUST call setMediationState to update the UI when the speaker changes or when tension is detected.
          - If you hear the partners interrupting each other, IMMEDIATELY stop them and return to a 10-second silent breathing pause (INTERVENTION).
          - Be firm but incredibly loving and neutral.
          - The current users are ${userData?.userName} and ${userData?.partnerName}.
        `,
      }
    });
    sessionPromiseRef.current = sessionPromise;
  };

  useEffect(() => { 
    startMediation(); 
    return () => { 
        if (sessionPromiseRef.current) sessionPromiseRef.current.then(s => s.close()); 
        stopAmbientMusic();
    }; 
  }, []);

  const getStabilityColor = () => {
    if (phase === 'intervention') return '#FF007F'; // Neon Pink for alert
    if (stability > 0.8) return '#00FF41'; // Neon Green for calm
    if (stability > 0.4) return '#FFCC00'; // Amber for tension
    return '#FF0000'; // Red for crisis
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#FDFCF0] flex flex-col items-center justify-center p-6 animate-fade-in overflow-hidden">
      {/* Background Ambience */}
      <div 
        className="absolute inset-0 opacity-10 transition-colors duration-[3000ms]"
        style={{ backgroundColor: getStabilityColor() }}
      />

      <div className="text-center w-full max-w-lg z-10">
        <header className="mb-16">
          <h2 className="text-5xl font-light mb-4 transition-all duration-1000">
            {phase === 'grounding' && 'Grounding.'}
            {phase === 'mediation' && 'The Floor.'}
            {phase === 'intervention' && 'Pause.'}
          </h2>
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#262626]/30 heading-font">
              {phase === 'grounding' && 'Aligning Frequencies'}
              {phase === 'mediation' && (activeSpeaker ? `${activeSpeaker}'s Turn` : 'Dialogue')}
              {phase === 'intervention' && 'Rising Tension Detected'}
          </p>
        </header>
        
        <div className="relative h-64 flex items-center justify-center mb-24">
            {/* The Stability Gauge (Dynamic Orb) */}
            <div 
                className="w-24 h-24 rounded-full blur-3xl transition-all duration-500" 
                style={{
                    backgroundColor: getStabilityColor(),
                    transform: `scale(${1 + (volume * 30) + (1 - stability) * 2})`, 
                    opacity: 0.2 + (volume * 2)
                }} 
            />
            
            {/* Inner Ring */}
            <div 
                className={`w-32 h-32 rounded-full border border-black/5 flex items-center justify-center transition-all duration-1000 ${phase === 'grounding' ? 'animate-[pulse_4s_infinite]' : ''}`}
                style={{ borderColor: `${getStabilityColor()}20` }}
            >
               {activeSpeaker && (
                 <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#262626]/40 heading-font animate-fade-in">
                   {activeSpeaker}
                 </span>
               )}
            </div>

            {/* Tension Indicator */}
            {stability < 0.7 && (
                <div className="absolute top-0 text-[8px] font-bold uppercase tracking-widest text-orange-500/60 animate-pulse">
                  Unstable Energy
                </div>
            )}
        </div>

        <div className="mb-24 px-8 min-h-[4rem]">
            <p className="text-xl leading-relaxed text-[#262626] italic text-center font-light opacity-80">
                {transcription || (phase === 'grounding' ? "Focus on the pulse of the light..." : "Safe space established.")}
            </p>
        </div>

        <div className="flex flex-col items-center gap-6">
            <button 
                onClick={() => { if (sessionPromiseRef.current) sessionPromiseRef.current.then(s => s.close()); onClose(); }} 
                className="text-[10px] font-bold uppercase tracking-widest text-[#262626]/40 hover:text-[#262626] border-b border-transparent hover:border-[#262626] pb-1 transition-all heading-font"
            >
                Dissolve Session
            </button>
        </div>
      </div>
      
      <style>{`
        @keyframes pulse {
            0% { transform: scale(1); opacity: 0.1; }
            50% { transform: scale(1.2); opacity: 0.3; }
            100% { transform: scale(1); opacity: 0.1; }
        }
      `}</style>
    </div>
  );
};

export default ConflictNavigator;
