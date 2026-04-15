import React from 'react';
import { motion } from 'motion/react';
import { Shield, AlertCircle, Clock, ChevronRight } from 'lucide-react';
import { cn } from '../../../../lib/utils';

interface FeedItem {
  id: string;
  type: 'PATROL' | 'SOS';
  title: string;
  subtitle: string;
  timestamp: string;
  status: 'SUCCESS' | 'WARNING' | 'CRITICAL';
}

interface CommandFeedProps {
  items: FeedItem[];
}

export const CommandFeed: React.FC<CommandFeedProps> = ({ items }) => {
  return (
    <div className="flex flex-col h-full bg-scmd-slate/30 rounded-[32px] border border-slate-800/50 overflow-hidden">
      <div className="p-6 border-b border-slate-800/50 flex justify-between items-center">
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Bảng điều hành thời gian thực</h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-scmd-cyber animate-pulse" />
          <span className="text-[10px] font-bold text-scmd-cyber uppercase tracking-widest">Live</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
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
                "p-4 rounded-2xl border transition-all group cursor-pointer",
                item.status === 'CRITICAL' 
                  ? "bg-scmd-alert/10 border-scmd-alert/30 animate-pulse" 
                  : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  item.type === 'SOS' ? "bg-scmd-alert text-white" : "bg-scmd-cyber/20 text-scmd-cyber"
                )}>
                  {item.type === 'SOS' ? <AlertCircle size={20} /> : <Shield size={20} />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h4 className={cn(
                      "text-sm font-bold truncate",
                      item.status === 'CRITICAL' ? "text-scmd-alert" : "text-slate-200"
                    )}>
                      {item.title}
                    </h4>
                    <span className="text-[10px] font-bold text-slate-500 shrink-0 ml-2">
                      {new Date(item.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{item.subtitle}</p>
                </div>
                
                <ChevronRight size={16} className="text-slate-700 group-hover:text-slate-500 transition-colors" />
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
