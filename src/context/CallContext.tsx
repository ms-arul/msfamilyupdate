import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, PhoneIncoming, Mic, MicOff, Radio, Volume2, VolumeX, Clock, Shield, Wifi } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { sendPushToUser } from '../utils/pushService';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

import { MicPermission } from '../plugins';
import { initCallActionTypes } from '../utils/notificationService';
import { createSafeContext } from './contextHelper';

/**
 * In-App Voice Call — WebRTC + Supabase Realtime Broadcast
 *
 * Architecture:
 * 1. Every logged-in user subscribes to their personal channel: `calls_to_{userId}`
 * 2. To call someone, the caller sends an 'incoming_call' broadcast to the target's personal channel
 * 3. If accepted, both join a shared signaling channel for WebRTC offer/answer/ICE
 * 4. WebRTC handles actual peer-to-peer audio
 */

export type CallState = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';

export interface CallContextType {
  startCall: (targetId: string, targetName: string) => Promise<void>;
  endCall: () => void;
  acceptCall: () => Promise<void>;
  declineCall: () => void;
  toggleMute: () => void;
  callState: CallState;
  remoteName: string;
  isMuted: boolean;
  callDuration: number;
}

const [useCall, CallContextProvider] = createSafeContext<CallContextType>('Call');
export { useCall };

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ]
};

interface CallProviderProps {
  children: React.ReactNode;
}

export const CallProvider: React.FC<CallProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [callState, _setCallState] = useState<CallState>('idle'); // idle | calling | ringing | connected | ended
  const setCallState = useCallback((val: CallState) => {
    _setCallState(val);
    callStateRef.current = val;
  }, []);
  const [remoteName, setRemoteName] = useState<string>('');
  const [remoteId, setRemoteId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSpeaker, setIsSpeaker] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [micPermission, setMicPermission] = useState<string>('unknown'); // unknown | granted | denied | prompt

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const signalingChannelRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const pendingOfferRef = useRef<{
    callerId: string;
    callerName?: string;
    signalingChannel: string;
    offer: RTCSessionDescriptionInit;
  } | null>(null);
  const receivingAudioRef = useRef<HTMLAudioElement | null>(null);
  const callingAudioRef = useRef<HTMLAudioElement | null>(null);
  const rebroadcastRef = useRef<any>(null);      // caller's re-send interval
  const callTimeoutRef = useRef<any>(null);      // 45s unanswered timeout
  const targetChannelRef = useRef<any>(null);    // caller's subscription to target's channel
  const callStateRef = useRef<CallState>('idle');      // avoids stale closures
  const hasVibratedRef = useRef<boolean>(false);

  useEffect(() => {
    try {
      receivingAudioRef.current = new Audio('/tones/call_receiving.mp3');
      receivingAudioRef.current.loop = true;
      callingAudioRef.current = new Audio('/tones/call_waiting.mp3');
      callingAudioRef.current.loop = true;
    } catch(e) {}
  }, []);

  // ═══ CHECK MIC PERMISSION ON MOUNT ═══
  useEffect(() => {
    if (navigator.permissions?.query) {
      navigator.permissions.query({ name: 'microphone' as PermissionName }).then(result => {
        setMicPermission(result.state); // 'granted' | 'denied' | 'prompt'
        result.onchange = () => setMicPermission(result.state);
      }).catch(() => setMicPermission('unknown'));
    }
  }, []);

  // ═══ PLAY RINGTONE ON RINGING / CALLING ═══
  useEffect(() => {
    if (callState === 'ringing') {
      try { receivingAudioRef.current?.play().catch(() => {}); } catch (e) {}
      // Vibrate if supported
      if (navigator.vibrate) {
        try {
          navigator.vibrate([300, 200, 300, 200, 300]);
          hasVibratedRef.current = true;
        } catch (e) {}
      }
    } else if (callState === 'calling') {
      try { callingAudioRef.current?.play().catch(() => {}); } catch (e) {}
    } else {
      try {
        if (receivingAudioRef.current) {
          receivingAudioRef.current.pause();
          receivingAudioRef.current.currentTime = 0;
        }
        if (callingAudioRef.current) {
          callingAudioRef.current.pause();
          callingAudioRef.current.currentTime = 0;
        }
      } catch (e) {}

      if (navigator.vibrate && hasVibratedRef.current) {
        try {
          navigator.vibrate(0);
          hasVibratedRef.current = false;
        } catch (e) {}
      }
    }
    
    return () => {
      try {
        receivingAudioRef.current?.pause();
        callingAudioRef.current?.pause();
      } catch (e) {}
    };
  }, [callState]);

  // ═══ PREVENT SCREEN SLEEP DURING CALLS ═══
  useEffect(() => {
    const manageWakeLock = async () => {
      try {
        if (callState !== 'idle') {
          await KeepAwake.keepAwake();
        } else {
          await KeepAwake.allowSleep();
        }
      } catch (e) {
        console.warn('KeepAwake error:', e);
      }
    };
    manageWakeLock();
  }, [callState]);

  // ═══ LOCAL NOTIFICATIONS FOR CALLS ═══
  useEffect(() => {
    initCallActionTypes();
  }, []);

  // ═══ CLEANUP ═══
  const cleanup = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (rebroadcastRef.current) { clearInterval(rebroadcastRef.current); rebroadcastRef.current = null; }
    if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
    if (pcRef.current) { try { pcRef.current.close(); } catch {} pcRef.current = null; }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (signalingChannelRef.current) {
      try { supabase.removeChannel(signalingChannelRef.current); } catch {}
      signalingChannelRef.current = null;
    }
    if (targetChannelRef.current) {
      try { supabase.removeChannel(targetChannelRef.current); } catch {}
      targetChannelRef.current = null;
    }
    pendingOfferRef.current = null;
    setCallDuration(0);
    setIsMuted(false);
    setIsSpeaker(false);
  }, []);

  // ═══ END CALL ═══
  const endCall = useCallback(() => {
    // Notify remote via signaling channel
    if (signalingChannelRef.current) {
      try {
        signalingChannelRef.current.send({
          type: 'broadcast', event: 'webrtc',
          payload: { type: 'hangup', from: user?.id }
        });
      } catch {}
    }
    // Also notify via the remote user's personal channel (in case signaling channel is dead)
    if (remoteId && user?.id) {
      try {
        const personalCh = supabase.channel(`calls_to_${remoteId}_hangup_${Date.now()}`, {
          config: { broadcast: { self: false } }
        });
        personalCh.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            personalCh.send({
              type: 'broadcast', event: 'call_ended',
              payload: { from: user.id }
            });
            // Clean up the temp channel after sending
            setTimeout(() => { try { supabase.removeChannel(personalCh); } catch {} }, 1000);
          }
        });
      } catch {}
    }
    cleanup();
    setCallState('ended');
    setTimeout(() => setCallState('idle'), 2500);
  }, [cleanup, user, remoteId, setCallState]);

  // ═══ GET MIC (FIXED) ═══
  const getMic = async (): Promise<MediaStream | null> => {
    try {
      if (Capacitor.isNativePlatform()) {
        try {
          await MicPermission.checkPermission();
        } catch (nativeErr) {
          console.warn('Native mic permission rejected:', nativeErr);
          setMicPermission('denied');
          return null;
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setMicPermission('granted');
      return stream;
    } catch (err: any) {
      console.warn('Mic access failed:', err.name);
      setMicPermission('denied');
      return null;
    }
  };

  // ═══ SETUP WEBRTC PEER CONNECTION ═══
  const setupPC = useCallback((stream: MediaStream) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local audio tracks
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    // Send ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && signalingChannelRef.current) {
        try {
          signalingChannelRef.current.send({
            type: 'broadcast', event: 'webrtc',
            payload: { type: 'ice', candidate: event.candidate, from: user?.id }
          });
        } catch {}
      }
    };

    // Receive remote audio
    pc.ontrack = (event) => {
      if (remoteAudioRef.current && event.streams[0]) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };

    // Monitor connection state
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setCallState('connected');
        if (!timerRef.current) {
          timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
        }
      } else if (['disconnected', 'failed'].includes(pc.connectionState)) {
        endCall();
      }
    };

    pcRef.current = pc;
    return pc;
  }, [user, endCall, setCallState]);

  // ═══ JOIN SIGNALING CHANNEL ═══
  const joinSignalingChannel = useCallback((channelName: string) => {
    // Clean any previous signaling channel
    if (signalingChannelRef.current) {
      try { supabase.removeChannel(signalingChannelRef.current); } catch {}
    }

    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } }
    });

    channel.on('broadcast', { event: 'webrtc' }, async ({ payload }) => {
      if (!payload || payload.from === user?.id) return;

      try {
        if (payload.type === 'offer' && pcRef.current) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          const answer = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(answer);
          channel.send({
            type: 'broadcast', event: 'webrtc',
            payload: { type: 'answer', sdp: answer, from: user?.id }
          });
        } else if (payload.type === 'answer' && pcRef.current) {
          if (pcRef.current.signalingState === 'have-local-offer') {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            
            // Instantly transition to connected on caller side when answer is received
            if (callStateRef.current === 'calling') {
              setCallState('connected');
              if (rebroadcastRef.current) { clearInterval(rebroadcastRef.current); rebroadcastRef.current = null; }
              if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
              if (!timerRef.current) {
                timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
              }
            }
          }
        } else if (payload.type === 'ice' && payload.candidate && pcRef.current) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } else if (payload.type === 'hangup') {
          cleanup();
          setCallState('ended');
          setTimeout(() => setCallState('idle'), 2500);
        }
      } catch (e) {
        console.warn('WebRTC signal error:', e);
      }
    });

    channel.subscribe();
    signalingChannelRef.current = channel;
    return channel;
  }, [user, cleanup, setCallState]);

  // ═══ START CALL (CALLER) ═══
  const startCall = useCallback(async (targetId: string, targetName: string) => {
    if (!user || callStateRef.current !== 'idle') return;

    setRemoteId(targetId);
    setRemoteName(targetName);
    setCallState('calling');

    // Get microphone
    const stream = await getMic();
    if (!stream) {
      setCallState('idle');
      setMicPermission('denied');
      return;
    }
    localStreamRef.current = stream;

    // Setup WebRTC
    const pc = setupPC(stream);

    // Join shared signaling channel
    const sigChannelName = `call_${[user.id, targetId].sort().join('_')}`;
    const sigChannel = joinSignalingChannel(sigChannelName);

    // Wait for channel to be ready
    await new Promise(r => setTimeout(r, 800));

    // Create offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Send push notification to wake up the receiver (HIGH priority for calls)
    sendPushToUser(
      targetId, 
      'அழைப்பு வருகிறது 📞', 
      `${user.name || user.email?.split('@')[0] || 'குடும்ப உறுப்பினர்'} உங்களை அழைக்கிறார்...`,
      'high'
    );

    // Send the call invitation to the target's personal channel
    const targetChannel = supabase.channel(`calls_to_${targetId}`, {
      config: { broadcast: { self: false } }
    });
    targetChannelRef.current = targetChannel;

    // Listen for decline/hangup from target on their personal channel
    targetChannel.on('broadcast', { event: 'call_declined' }, ({ payload }) => {
      if (payload?.from === targetId) {
        console.log('[Call] Remote declined the call');
        cleanup();
        setCallState('ended');
        setTimeout(() => setCallState('idle'), 2500);
      }
    });
    targetChannel.on('broadcast', { event: 'call_ended' }, ({ payload }) => {
      if (payload?.from === targetId) {
        console.log('[Call] Remote ended/hung up');
        cleanup();
        setCallState('ended');
        setTimeout(() => setCallState('idle'), 2500);
      }
    });

    targetChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await new Promise(r => setTimeout(r, 300));
        
        const callPayload = {
          callerId: user.id,
          callerName: user.name || user.email?.split('@')[0] || 'Unknown',
          signalingChannel: sigChannelName,
          offer: offer,
        };

        const sendOffer = () => {
          if (callStateRef.current !== 'calling') return; // Stop if state changed
          targetChannel.send({
            type: 'broadcast',
            event: 'incoming_call',
            payload: callPayload
          });
        };

        sendOffer();
        
        // Keep broadcasting every 3s — store ref so cleanup can clear it
        rebroadcastRef.current = setInterval(() => {
          if (!pcRef.current || callStateRef.current !== 'calling') {
            if (rebroadcastRef.current) { clearInterval(rebroadcastRef.current); rebroadcastRef.current = null; }
            return;
          }
          sendOffer();
        }, 3000);

        // Also send offer on the signaling channel
        sigChannel.send({
          type: 'broadcast', event: 'webrtc',
          payload: { type: 'offer', sdp: offer, from: user.id }
        });
      }
    });

    // ── 45-second timeout for unanswered calls ──
    callTimeoutRef.current = setTimeout(() => {
      if (callStateRef.current === 'calling') {
        console.log('[Call] Unanswered — timing out');
        cleanup();
        setCallState('ended');
        setTimeout(() => setCallState('idle'), 2500);
      }
    }, 45000);

  }, [user, setupPC, joinSignalingChannel, cleanup, setCallState]);

  // ═══ ACCEPT CALL (RECEIVER) ═══
  const acceptCall = useCallback(async () => {
    const pending = pendingOfferRef.current;
    if (!pending) return;

    // Get microphone
    const stream = await getMic();
    if (!stream) { setCallState('idle'); cleanup(); return; }
    localStreamRef.current = stream;

    // Setup WebRTC
    const pc = setupPC(stream);

    // Join the shared signaling channel
    joinSignalingChannel(pending.signalingChannel);

    // Wait for channel
    await new Promise(r => setTimeout(r, 500));

    // Set the offer and create answer
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(pending.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Send answer on signaling channel
      if (signalingChannelRef.current) {
        signalingChannelRef.current.send({
          type: 'broadcast', event: 'webrtc',
          payload: { type: 'answer', sdp: answer, from: user?.id }
        });
      }
      setCallState('connected');
      timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    } catch (e) {
      console.error('Failed to accept call:', e);
      cleanup();
      setCallState('idle');
    }

    pendingOfferRef.current = null;
  }, [user, setupPC, joinSignalingChannel, cleanup, setCallState]);

  // ═══ LISTEN FOR INCOMING CALLS (GLOBAL) ═══
  useEffect(() => {
    if (!user?.id) return;

    const personalChannel = supabase.channel(`calls_to_${user.id}`, {
      config: { broadcast: { self: false } }
    });

    personalChannel.on('broadcast', { event: 'incoming_call' }, ({ payload }) => {
      // Use callStateRef to avoid stale closure
      if (!payload || callStateRef.current !== 'idle') return;

      // Store the incoming call data (including callerId for decline routing)
      pendingOfferRef.current = {
        callerId: payload.callerId,
        callerName: payload.callerName,
        signalingChannel: payload.signalingChannel,
        offer: payload.offer,
      };

      setRemoteId(payload.callerId);
      setRemoteName(payload.callerName || 'Family Member');
      setCallState('ringing');
    });

    // Also listen for call_ended from any caller (e.g. caller hung up before we answered)
    personalChannel.on('broadcast', { event: 'call_ended' }, ({ payload }) => {
      if (callStateRef.current === 'ringing' || callStateRef.current === 'connected') {
        cleanup();
        setCallState('ended');
        setTimeout(() => setCallState('idle'), 2500);
      }
    });

    personalChannel.subscribe();

    return () => {
      try { supabase.removeChannel(personalChannel); } catch {}
    };
  }, [user?.id, cleanup, setCallState]); // Only depend on user.id

  // ═══ TOGGLE MUTE ═══
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  // ═══ TOGGLE SPEAKER ═══
  const toggleSpeaker = useCallback(() => {
    setIsSpeaker(prev => !prev);
    if (remoteAudioRef.current) {
      const el = remoteAudioRef.current as any;
      // setSinkId is available on some browsers for speaker routing
      if (el.setSinkId) {
        // Toggle between default and speaker output
        el.setSinkId(isSpeaker ? 'default' : 'communications')
          .catch(() => {});
      }
    }
  }, [isSpeaker]);

  // ═══ DECLINE CALL ═══
  const declineCall = useCallback(() => {
    const pending = pendingOfferRef.current;
    
    // ── Send decline signal to the caller ──
    // 1. Via signaling channel (if joined)
    if (signalingChannelRef.current) {
      try {
        signalingChannelRef.current.send({
          type: 'broadcast', event: 'webrtc',
          payload: { type: 'hangup', from: user?.id }
        });
      } catch {}
    }
    // 2. Via caller's personal channel (guaranteed delivery)
    const callerId = pending?.callerId || remoteId;
    if (callerId && user?.id) {
      try {
        const declineCh = supabase.channel(`calls_to_${callerId}_decline_${Date.now()}`, {
          config: { broadcast: { self: false } }
        });
        declineCh.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            declineCh.send({
              type: 'broadcast', event: 'call_declined',
              payload: { from: user.id }
            });
            setTimeout(() => { try { supabase.removeChannel(declineCh); } catch {} }, 1000);
          }
        });
      } catch {}
    }

    pendingOfferRef.current = null;
    cleanup();
    setCallState('idle');
  }, [cleanup, user, remoteId, setCallState]);

  // ═══ HANDLE NOTIFICATION ACTIONS & SYNC ═══
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    
    const listener = LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
      if (action.actionId === 'accept') {
        acceptCall();
      } else if (action.actionId === 'decline') {
        declineCall();
      } else if (action.actionId === 'end') {
        endCall();
      }
    });

    return () => {
      listener.then(l => l.remove()).catch(()=>{});
    };
  }, [acceptCall, declineCall, endCall]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const manageNotifications = async () => {
      // Clear existing call notifications
      await LocalNotifications.cancel({ notifications: [{ id: 9999 }, { id: 9998 }] }).catch(()=>{});

      if (callState === 'ringing') {
        await LocalNotifications.schedule({
          notifications: [{
            id: 9999,
            title: 'அழைப்பு வருகிறது 📞',
            body: `${remoteName} உங்களை அழைக்கிறார்...`,
            actionTypeId: 'CALL_RINGING',
            channelId: 'ms_family_calls',
            sound: 'call_receiving',
            extra: { isCall: true }
          }]
        }).catch(()=>{});
      } else if (callState === 'connected') {
        await LocalNotifications.schedule({
          notifications: [{
            id: 9998,
            title: 'நடப்பு அழைப்பு 📞',
            body: `${remoteName} உடன் பேசிக்கொண்டிருக்கிறீர்கள்`,
            actionTypeId: 'CALL_ONGOING',
            channelId: 'ms_family_notifications',
            extra: { isCall: true }
          }]
        }).catch(()=>{});
      }
    };

    manageNotifications();
  }, [callState, remoteName]);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  // ═══ STATUS LABEL ═══
  const getStatusInfo = () => {
    switch (callState) {
      case 'calling': return { label: 'Calling...', icon: <Phone size={14} className="text-primary-400 animate-pulse" />, color: 'text-primary-300' };
      case 'ringing': return { label: 'Incoming Call', icon: <PhoneIncoming size={14} className="text-emerald-400 animate-bounce" />, color: 'text-emerald-300' };
      case 'connected': return { label: formatTime(callDuration), icon: <Radio size={14} className="text-emerald-400" />, color: 'text-emerald-300' };
      case 'ended': return { label: 'Call Ended', icon: <PhoneOff size={14} className="text-red-400" />, color: 'text-red-300' };
      default: return { label: '', icon: null, color: '' };
    }
  };

  return (
    <CallContextProvider value={{ startCall, endCall, acceptCall, declineCall, toggleMute, callState, remoteName, isMuted, callDuration }}>
      {children}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* ═══ CALL UI OVERLAY ═══ */}
      <AnimatePresence>
        {callState !== 'idle' && (() => {
          const status = getStatusInfo();
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex flex-col items-center justify-between"
              style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 40%, #312e81 70%, #0f172a 100%)' }}
            >
              {/* ── Top Bar ── */}
              <div className="w-full flex items-center justify-between px-6 pt-12 pb-4">
                <div className="flex items-center gap-2">
                  <Shield size={14} className="text-emerald-400" />
                  <span className="text-emerald-400 text-xs font-semibold tracking-wider uppercase">Encrypted</span>
                </div>
                {callState === 'connected' && (
                  <div className="flex items-center gap-2">
                    <Wifi size={14} className="text-emerald-400" />
                    <span className="text-emerald-400 text-xs font-medium">Connected</span>
                  </div>
                )}
              </div>

              {/* ── Center: Avatar + Info ── */}
              <div className="flex-1 flex flex-col items-center justify-center -mt-8">
                {/* Pulse rings for calling/ringing */}
                {(callState === 'calling' || callState === 'ringing') && (
                  <div className="absolute">
                    <motion.div animate={{ scale: [1, 2.8], opacity: [0.2, 0] }} transition={{ duration: 2.5, repeat: Infinity }} className="w-36 h-36 rounded-full border-2 border-primary-400/20" />
                    <motion.div animate={{ scale: [1, 2.8], opacity: [0.15, 0] }} transition={{ duration: 2.5, repeat: Infinity, delay: 0.8 }} className="absolute inset-0 w-36 h-36 rounded-full border border-primary-400/15" />
                    <motion.div animate={{ scale: [1, 2.8], opacity: [0.1, 0] }} transition={{ duration: 2.5, repeat: Infinity, delay: 1.6 }} className="absolute inset-0 w-36 h-36 rounded-full border border-primary-400/10" />
                  </div>
                )}

                {/* Connected glow */}
                {callState === 'connected' && (
                  <motion.div
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="absolute w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl"
                  />
                )}

                {/* Avatar */}
                <motion.div
                  initial={{ scale: 0.5, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ type: 'spring', bounce: 0.4 }}
                  className="relative mb-8"
                >
                  <div className={`w-36 h-36 rounded-full flex items-center justify-center text-white font-bold text-6xl shadow-2xl ring-4 ${
                    callState === 'connected'
                      ? 'bg-gradient-to-br from-emerald-400 to-emerald-700 shadow-emerald-500/40 ring-emerald-400/20'
                      : callState === 'ended'
                        ? 'bg-gradient-to-br from-slate-500 to-slate-700 shadow-slate-500/30 ring-slate-400/20'
                        : 'bg-gradient-to-br from-primary-400 to-primary-700 shadow-primary-500/40 ring-white/10'
                  }`}>
                    {remoteName?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  {callState === 'connected' && (
                    <motion.div
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 rounded-full border-4 border-[#1e1b4b] flex items-center justify-center"
                    >
                      <Radio size={12} className="text-white" />
                    </motion.div>
                  )}
                </motion.div>

                {/* Name + Status */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-center"
                >
                  <h2 className="text-white text-3xl font-extrabold mb-2 tracking-tight">{remoteName}</h2>
                  <p className={`${status.color} text-sm font-semibold tracking-wide flex items-center justify-center gap-2`}>
                    {status.icon}
                    {status.label}
                  </p>

                  {/* Duration subtext */}
                  {callState === 'connected' && (
                    <p className="text-slate-500 text-xs mt-2 flex items-center justify-center gap-1">
                      <Clock size={11} /> Voice Call
                    </p>
                  )}
                </motion.div>

                {/* Mic denied message */}
                {micPermission === 'denied' && callState === 'calling' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 bg-red-500/15 border border-red-500/30 rounded-2xl px-5 py-3 max-w-xs text-center"
                  >
                    <p className="text-red-300 text-xs font-medium">
                      Microphone access denied. Please enable it in your browser/device settings.
                    </p>
                  </motion.div>
                )}
              </div>

              {/* ── Bottom: Action Buttons ── */}
              <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="w-full pb-16 pt-6 px-8"
              >
                {/* Connected controls row */}
                {callState === 'connected' && (
                  <div className="flex items-center justify-center gap-6 mb-8">
                    {/* Mute */}
                    <motion.button whileTap={{ scale: 0.85 }} onClick={toggleMute}
                      className="flex flex-col items-center gap-1.5"
                    >
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                        isMuted ? 'bg-red-500 text-white shadow-lg shadow-red-500/40' : 'bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/15'
                      }`}>
                        {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                      </div>
                      <span className="text-white/60 text-[10px] font-medium">{isMuted ? 'Unmute' : 'Mute'}</span>
                    </motion.button>

                    {/* Speaker */}
                    <motion.button whileTap={{ scale: 0.85 }} onClick={toggleSpeaker}
                      className="flex flex-col items-center gap-1.5"
                    >
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                        isSpeaker ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/40' : 'bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/15'
                      }`}>
                        {isSpeaker ? <Volume2 size={22} /> : <VolumeX size={22} />}
                      </div>
                      <span className="text-white/60 text-[10px] font-medium">Speaker</span>
                    </motion.button>
                  </div>
                )}

                {/* Main call action buttons */}
                <div className="flex items-center justify-center gap-10">
                  {/* Accept (only for ringing) */}
                  {callState === 'ringing' && (
                    <motion.button whileTap={{ scale: 0.8 }}
                      className="flex flex-col items-center gap-2"
                    >
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                        onClick={acceptCall}
                        className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-2xl shadow-emerald-500/50 ring-4 ring-emerald-400/20"
                      >
                        <Phone size={32} />
                      </motion.div>
                      <span className="text-emerald-400 text-xs font-semibold">Accept</span>
                    </motion.button>
                  )}

                  {/* End / Decline */}
                  {callState !== 'ended' && (
                    <motion.button whileTap={{ scale: 0.8 }}
                      onClick={callState === 'ringing' ? declineCall : endCall}
                      className="flex flex-col items-center gap-2"
                    >
                      <div className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center text-white shadow-2xl shadow-red-500/50 ring-4 ring-red-400/20">
                        <PhoneOff size={32} />
                      </div>
                      <span className="text-red-400 text-xs font-semibold">{callState === 'ringing' ? 'Decline' : 'End'}</span>
                    </motion.button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </CallContextProvider>
  );
};
