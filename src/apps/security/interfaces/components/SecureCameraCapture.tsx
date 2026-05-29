import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, RefreshCw, Upload, X, FileWarning, MapPin } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';

interface SecureCameraCaptureProps {
  onCapture: (url: string) => void;
  onCancel: () => void;
  uploadCategory?: string;
  className?: string;
}

export const SecureCameraCapture: React.FC<SecureCameraCaptureProps> = ({ 
  onCapture, 
  onCancel, 
  uploadCategory = 'EVIDENCE',
  className 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn("[SecureCamera] Could not get location", err),
        { enableHighAccuracy: true }
      );
    }

    const startCamera = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, 
          audio: false 
        });
        activeStream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      } catch (err: any) {
        setErrorMsg('Không thể truy cập camera: ' + err.message + '. Vui lòng cấp quyền.');
      }
    };
    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // V.5.6.2.0: Optimization - Resize to max 1920px width for storage efficiency
    const MAX_WIDTH = 1920;
    const scale = video.videoWidth > MAX_WIDTH ? MAX_WIDTH / video.videoWidth : 1;
    
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const watermarkHeight = 80;
    ctx.fillStyle = 'rgba(13, 19, 36, 0.7)'; // Deep Navy
    ctx.fillRect(0, canvas.height - watermarkHeight, canvas.width, watermarkHeight);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    
    const timeStr = new Date().toLocaleString('vi-VN');
    const locStr = location ? `GPS: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` : 'GPS: Không khả dụng (No Signal)';
    
    ctx.fillText(`TIME: ${timeStr} | ${locStr}`, 20, canvas.height - 45);
    
    ctx.font = 'bold 16px "Inter", sans-serif';
    ctx.fillStyle = '#4285F4'; // Blue 400
    ctx.fillText('SCMD PRO - SECURE EVIDENCE', 20, canvas.height - 20);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#FF3B30'; // Red
    ctx.font = 'bold 22px "Inter", sans-serif';
    ctx.fillText('LIVE CAPTURE', canvas.width - 20, canvas.height - 35);
    
    // V.5.6.2.0: Compression at 0.8 quality
    canvas.toBlob((blob) => {
      if (blob) {
        setPhotoBlob(blob);
        const url = URL.createObjectURL(blob);
        setPhotoDataUrl(url);
      }
    }, 'image/jpeg', 0.8);
  };

  const retakePhoto = () => {
    if (photoDataUrl) {
      URL.revokeObjectURL(photoDataUrl);
    }
    setPhotoBlob(null);
    setPhotoDataUrl(null);
    setErrorMsg(null);
  };

  const uploadMutation = useMutation({
    mutationFn: async ({ blob, category, tags }: { blob: Blob, category: string, tags: string[] }) => {
      const formData = new FormData();
      formData.append('file', blob, `EVIDENCE_${Date.now()}.jpg`);
      formData.append('category', category);
      formData.append('tags', JSON.stringify(tags));

      const csrfToken = document.cookie.split('; ').find((row) => row.startsWith('scmd_csrf='))?.split('=').slice(1).join('=');
      const res = await fetch('/api/v1/tenant/attachments', {
        method: 'POST',
        credentials: 'include',
        headers: csrfToken ? { 'x-csrf-token': decodeURIComponent(csrfToken) } : {},
        body: formData
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Lỗi hệ thống khi tải ảnh lên');
      }
      return res.json();
    },
    onSuccess: (data) => {
      onCapture(data.url || data.fileUrl || data.items?.[0]?.url);
    },
    onError: (err: Error) => {
      setErrorMsg('Tải lên thất bại: ' + err.message);
    }
  });

  const handleUpload = () => {
    if (!photoBlob) return;
    const tags = ['LiveCapture'];
    if (location) {
      tags.push(`lat:${location.lat.toFixed(6)}`, `lng:${location.lng.toFixed(6)}`);
    }
    uploadMutation.mutate({ blob: photoBlob, category: uploadCategory, tags });
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 z-[999] bg-scmd-navy/95 backdrop-blur-md flex flex-col items-center justify-center p-4 md:p-8 ${className || ''}`}
      >
        <div className="absolute top-6 right-6">
          <button 
            onClick={onCancel}
            className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-red-500 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="w-full max-w-2xl bg-black rounded-3xl overflow-hidden shadow-2xl relative border border-white/10">
          {!photoDataUrl ? (
            <div className="relative aspect-[4/3] md:aspect-[16/9] w-full bg-black flex items-center justify-center">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover"
              />
              
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-between">
                <div className="text-white text-xs font-mono opacity-70">
                  {location ? <span className="flex items-center gap-1"><MapPin size={12}/> GPS: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span> : 'Đang lấy vị trí...'}
                </div>
              </div>

              {errorMsg && (
                <div className="absolute inset-0 bg-scmd-navy/90 flex flex-col items-center justify-center text-center p-6 space-y-4">
                  <FileWarning size={48} className="text-red-500" />
                  <p className="text-sm font-bold text-white tracking-widest leading-relaxed uppercase">{errorMsg}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="relative aspect-[4/3] md:aspect-[16/9] w-full bg-black">
              <img src={photoDataUrl} alt="Captured" className="w-full h-full object-contain" />
            </div>
          )}

          {/* Hidden Canvas for Watermarking */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="mt-8 flex items-center gap-6">
          {!photoDataUrl ? (
            <button 
              onClick={handleCapture}
              disabled={!!errorMsg}
              className="w-20 h-20 rounded-full border-4 border-scmd-primary bg-scmd-primary/20 flex items-center justify-center text-scmd-primary hover:bg-scmd-primary hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(37,99,235,0.3)]"
            >
              <Camera size={32} />
            </button>
          ) : (
            <>
              <button 
                onClick={retakePhoto}
                disabled={uploadMutation.isPending}
                className="px-6 py-4 rounded-2xl bg-white/10 text-white font-black uppercase text-xs tracking-widest flex items-center gap-2 hover:bg-white/20 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={18} /> Chụp lại
              </button>
              
              <button 
                onClick={handleUpload}
                disabled={uploadMutation.isPending}
                className="px-8 py-4 rounded-2xl bg-scmd-primary text-white font-black uppercase text-xs tracking-widest flex items-center gap-2 hover:bg-blue-600 transition-colors shadow-lg shadow-scmd-primary/30 disabled:opacity-50"
              >
                {uploadMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw size={18} className="animate-spin" /> Đang tải lên...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Upload size={18} /> Tải bằng chứng lên
                  </span>
                )}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
