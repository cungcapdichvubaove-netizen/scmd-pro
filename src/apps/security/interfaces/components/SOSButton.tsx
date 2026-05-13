import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { AlertCircle } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { getAuthHeaders } from '../../../common/utils/auth';
import { useAuth } from '../../../../context/AuthContext';

import socket from '../../../../lib/socket';

export const SOSButton: React.FC = () => {
  const { user, tenantId } = useAuth();
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isSent, setIsSent] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const constraintsRef = useRef(null);

  const HOLD_DURATION = 2000; // 2 seconds

  const [isActivated, setIsActivated] = useState(false);
  const [lastTap, setLastTap] = useState(0);

  const handleStart = (_e: React.MouseEvent | React.TouchEvent) => {
    if (isSent || !user?.staffId) return;
    
    // Double-tap activation guard
    const now = Date.now();
    if (!isActivated) {
      if (now - lastTap < 400) {
        setIsActivated(true);
        if ('vibrate' in navigator) navigator.vibrate(50);
      } else {
        setLastTap(now);
      }
      return;
    }

    setIsHolding(true);
    setProgress(0);
    startTimeRef.current = now;
    
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min((elapsed / HOLD_DURATION) * 100, 100);
      setProgress(newProgress);
      
      if (elapsed >= HOLD_DURATION) {
        triggerSOS();
        handleEnd();
      }
    }, 50);
  };

  const handleEnd = () => {
    setIsHolding(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (!isSent) {
      setProgress(0);
    }
  };

  const triggerSOS = async () => {
    setIsSent(true);
    // Vibration feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 500]);
    }

    try {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const sosData = {
          location: { lat: pos.coords.latitude, lon: pos.coords.longitude },
          staffId: user?.staffId || "NV_UNKNOWN",
          tenantId: tenantId || "TENANT_UNKNOWN",
          message: "KHẨN CẤP: Bảo vệ yêu cầu hỗ trợ!"
        };

        // Emit via Socket.io for < 1s latency
        socket.emit('sos_signal', sosData);

        // Also save to database for audit
        await fetch('/api/security/sos', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            ...sosData,
            deviceId: navigator.userAgent
          })
        });
      });
    } catch (e) {
      console.error("SOS signal failed to send", e);
    }

    // Reset after 5 seconds
    setTimeout(() => setIsSent(false), 5000);
  };

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" ref={constraintsRef}>
      <motion.div
        drag
        dragConstraints={constraintsRef}
        dragElastic={0.1}
        dragMomentum={false}
        style={{ right: '20px', bottom: '220px' }}
        className="absolute z-[9999] touch-none pointer-events-auto"
        whileTap={{ scale: 0.9 }}
      >
      <div 
        className="relative w-24 h-24 flex items-center justify-center select-none"
        onMouseDown={handleStart}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchEnd={handleEnd}
      >
        {/* Progress Swirl (SVG) */}
        <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
          <circle
            cx="48"
            cy="48"
            r="42"
            fill="none"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth="6"
          />
          <motion.circle
            cx="48"
            cy="48"
            r="42"
            fill="none"
            stroke={isSent ? "#10b981" : "#ef4444"}
            strokeWidth="6"
            strokeDasharray="263.89"
            animate={{ strokeDashoffset: 263.89 - (263.89 * progress) / 100 }}
            transition={{ duration: 0.1 }}
            strokeLinecap="round"
          />
        </svg>

        {/* Inner Button */}
        <motion.div 
          animate={{
            scale: isSent ? 1.1 : (isHolding ? 1.1 : 1),
            backgroundColor: isSent ? "#10b981" : "#dc2626",
            borderColor: isSent ? "#34d399" : "#ef4444",
            boxShadow: isSent 
              ? "0 0 50px rgba(16,185,129,0.6)" 
              : (isHolding ? "0 0 40px rgba(239,68,68,0.5)" : "0 0 40px rgba(0,0,0,0.5)")
          }}
          transition={{ type: "spring", damping: 15, stiffness: 200 }}
          className={cn(
          "w-20 h-20 rounded-full flex flex-col items-center justify-center border-4",
          !isSent && !isHolding && "animate-pulse",
        )}>
          {isSent ? (
            <div className="text-white text-center">
              <AlertCircle size={28} className="mx-auto mb-1 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-tighter">ĐÃ GỬI SOS</span>
            </div>
          ) : !user?.staffId ? (
            <div className="text-white text-center opacity-70">
              <span className="text-[10px] font-black block tracking-tighter">ĐANG CONNECT</span>
            </div>
          ) : (
            <div className="text-white text-center">
              <span className="text-2xl font-black block tracking-tighter">SOS</span>
              <span className="text-[8px] font-black opacity-70 uppercase tracking-widest">Giữ 2 giây</span>
            </div>
          )}
        </motion.div>

        {/* Pulsing Aura when holding */}
        {isHolding && !isSent && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="absolute inset-0 bg-red-500 rounded-full -z-10"
          />
        )}
      </div>
    </motion.div>
    </div>
  );
};
