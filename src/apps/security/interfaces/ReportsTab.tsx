import React from 'react';
import { Printer, BarChart3, Shield, Clock, Eye, MapPin } from 'lucide-react';
import { SCMDCard } from '../../common/interfaces/components/SCMDCard';
import { SCMDButton } from '../../common/interfaces/components/SCMDButton';
import { FeatureLock } from './components/FeatureLock';
import { PatrolLog } from './types';

interface ReportsTabProps {
  isPro: boolean;
  patrolLogs: PatrolLog[];
  setShowUpgradeModal: (show: boolean) => void;
  onViewLog: (log: any) => void;
}

export const ReportsTab: React.FC<ReportsTabProps> = React.memo(({ isPro, patrolLogs, setShowUpgradeModal, onViewLog }) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-4xl font-black tracking-tight text-white">Báo cáo & Xuất dữ liệu</h2>
        <p className="text-slate-400 mt-2 font-medium">
          Kho lưu trữ báo cáo pháp lý, đối soát và lịch sử hoạt động.
        </p>
      </header>
      {!isPro ? (
        <FeatureLock
          title="Trung tâm Báo cáo Thông minh"
          onUpgrade={() => setShowUpgradeModal(true)}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <Printer className="text-emerald-400" size={32} />,
                color: 'emerald',
                title: 'Báo cáo PDF Smart',
                desc: 'Báo cáo tổng hợp có chữ ký số và phân tích AI.',
                action: 'Xuất PDF ngay',
              },
              {
                icon: <BarChart3 className="text-sky-400" size={32} />,
                color: 'sky',
                title: 'Đối soát Excel',
                desc: 'Dữ liệu thô dùng cho bộ phận kế toán và tính lương.',
                action: 'Tải Excel (.xlsx)',
              },
              {
                icon: <Shield className="text-slate-400" size={32} />,
                color: 'slate',
                title: 'Audit Logs',
                desc: 'Truy xuất lịch sử tác động hệ thống (Bảo mật).',
                action: 'Truy cập Logs',
              },
            ].map((item, i) => (
              <SCMDCard
                key={i}
                className={`bg-slate-900 border-${item.color}-500/20 p-8 flex flex-col items-center text-center group cursor-pointer hover:border-${item.color}-500/50 transition-all`}
              >
                <div
                  className={`w-16 h-16 bg-${item.color}-500/10 rounded-3xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                >
                  {item.icon}
                </div>
                <h4 className="text-lg font-black text-white mb-2">{item.title}</h4>
                <p className="text-xs text-slate-500 font-medium mb-6">{item.desc}</p>
                <SCMDButton className={`w-full bg-${item.color}-500 text-slate-950 font-black`}>
                  {item.action}
                </SCMDButton>
              </SCMDCard>
            ))}
          </div>
          <div className="bg-slate-900/50 rounded-[40px] border border-slate-800 p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-white uppercase tracking-tighter">
                Lịch sử Tuần tra
              </h3>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-800 px-3 py-1 rounded-md border border-white/5">
                {Array.isArray(patrolLogs) ? patrolLogs.length : 0} Bản ghi
              </span>
            </div>
            
            <div className="overflow-hidden bg-slate-950/50 rounded-3xl border border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/50 border-b border-slate-800">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">ID</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Thời gian</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Nhân viên</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Điểm</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Trạng thái</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {Array.isArray(patrolLogs) && patrolLogs.slice(0, 10).map((log) => (
                    <tr key={log.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs text-slate-500">#{log.id.slice(-6)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Clock size={12} className="text-slate-500" />
                          <span className="text-sm font-bold text-slate-300">
                            {new Date(log.startTime).toLocaleTimeString('vi-VN')}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium">
                          {new Date(log.startTime).toLocaleDateString('vi-VN')}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-white">{log.staffId}</span>
                      </td>
                      <td className="px-6 py-4">
                         <div className="flex items-center gap-2">
                          <MapPin size={12} className="text-scmd-primary" />
                          <span className="text-sm font-bold text-slate-300">
                            {log.checkpointName}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${
                          log.isSuspicious 
                            ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                            : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        }`}>
                          {log.isSuspicious ? 'NGHI VẤN' : 'HỢP LỆ'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => onViewLog(log)}
                          className="p-2 hover:bg-scmd-primary/20 text-slate-400 hover:text-scmd-primary rounded-xl transition-all"
                          title="Xem chi tiết"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!Array.isArray(patrolLogs) || patrolLogs.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-bold">
                        Chưa có lịch sử tuần tra được ghi nhận.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {Array.isArray(patrolLogs) && patrolLogs.length > 10 && (
              <div className="mt-4 text-center">
                <SCMDButton variant="ghost" className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] h-8">
                  Xem tất cả {patrolLogs.length} bản ghi
                </SCMDButton>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
});
