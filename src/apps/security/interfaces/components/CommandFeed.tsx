import React from 'react';
import { motion } from 'motion/react';
import { Shield, AlertCircle, Clock, ChevronRight } from 'lucide-react';
import { cn } from '../../../../lib/utils';

interface FeedItem {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  message?: string;
  timestamp: string;
  status: 'SUCCESS' | 'WARNING' | 'CRITICAL';
  count?: number;
  isGrouped?: boolean;
}

interface CommandFeedProps {
  items: FeedItem[];
}

export const CommandFeed: React.FC<CommandFeedProps> = ({ items }) => {
  return (
    <div className="flex flex-col h-full bg-scmd-surface rounded-[32px] border border-white/5 overflow-hidden">
      <div className="p-6 border-b border-white/5 flex justify-between items-center">
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-scmd-silver/60">Bảng điều hành thời gian thực</h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-scmd-cyber animate-pulse" />
          <span className="text-[10px] font-bold text-scmd-cyber uppercase tracking-widest">Live</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
        {(!Array.isArray(items) || items.length === 0) ? (
          <div className="h-full flex flex-col items-center justify-center text-scmd-silver opacity-20">
            <Clock size={32} className="mb-2" />
            <p className="text-xs font-bold uppercase tracking-widest">Chưa có hoạt động</p>
          </div>
        ) : (
          items.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "p-4 rounded-2xl border transition-all group cursor-pointer relative overflow-hidden",
                item.status === 'CRITICAL' 
                  ? "bg-scmd-alert/10 border-scmd-alert/30 animate-pulse" 
                  : item.isGrouped 
                    ? "bg-scmd-cyber/10 border-scmd-cyber/30"
                    : "bg-scmd-navy/40 border-white/5 hover:border-scmd-primary/30"
              )}
            >
              {item.isGrouped && (
                <div className="absolute top-0 right-0 p-2">
                  <div className="px-2 py-0.5 bg-scmd-cyber text-white text-[10px] font-black rounded-bl-xl shadow-lg animate-bounce">
                    X{item.count} LẦN
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  item.type === 'SOS' || item.status === 'CRITICAL' ? "bg-scmd-alert text-white" : "bg-scmd-cyber/20 text-scmd-cyber"
                )}>
                  {item.type === 'SOS' || item.status === 'CRITICAL' ? <AlertCircle size={20} /> : <Shield size={20} />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h4 className={cn(
                      "text-sm font-bold truncate",
                      item.status === 'CRITICAL' ? "text-scmd-alert" : "text-white"
                    )}>
                      {item.title}
                    </h4>
                    <span className="text-[10px] font-bold text-scmd-silver/40 shrink-0 ml-2">
                      {new Date(item.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-scmd-silver/60 truncate mt-0.5">{item.subtitle || item.message}</p>
                </div>
                
                <ChevronRight size={16} className="text-scmd-silver/20 group-hover:text-scmd-silver/60 transition-colors" />
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
