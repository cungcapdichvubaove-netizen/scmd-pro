import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../../../lib/api';

export const IncidentPrintView: React.FC = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const printToken = searchParams.get('printToken');
  const [incident, setIncident] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchIncident = async () => {
      try {
        // Fetch using the printToken which bypasses normal auth via middleware
        const data = await apiFetch(`/api/v1/tenant/incidents/${id}?printToken=${printToken}`);
        setIncident(data);
      } catch (err: any) {
        console.error('Failed to fetch incident for printing', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id && printToken) {
      fetchIncident();
    } else {
      setError('Missing incident ID or print token');
      setLoading(false);
    }
  }, [id, printToken]);

  if (loading) return <div className="p-10 font-mono text-sm uppercase">Đang tải dữ liệu báo cáo sự cố...</div>;
  if (error) return <div className="p-10 text-red-500 font-mono text-sm">Lỗi: {error}</div>;
  if (!incident) return <div className="p-10 font-mono text-sm">Không tìm thấy dữ liệu sự cố.</div>;

  return (
    <div className="bg-white text-slate-900 p-8 min-h-screen font-sans" id="print-content">
      {/* Header */}
      <div className="flex justify-between items-start border-b-4 border-slate-900 pb-4 mb-8">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Báo cáo sự cố an ninh</h1>
          <p className="text-sm font-bold text-slate-500 uppercase mt-1">Hệ thống SCMD Pro — Security Management & Digital Patrol</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold uppercase text-slate-400">Mã sự cố</p>
          <p className="text-xl font-black text-slate-900 font-mono">{incident.id.split('-')[0].toUpperCase()}</p>
        </div>
      </div>

      {/* Grid Info */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="space-y-4">
          <section>
            <h3 className="text-xs font-black uppercase text-slate-400 mb-1">Loại sự cố</h3>
            <p className="text-lg font-bold uppercase">{incident.type}</p>
          </section>
          <section>
            <h3 className="text-xs font-black uppercase text-slate-400 mb-1">Mức độ nghiêm trọng</h3>
            <div className={`inline-block px-2 py-1 rounded text-xs font-black uppercase ${
              incident.severity === 'CRITICAL' ? 'bg-red-600 text-white' : 
              incident.severity === 'HIGH' ? 'bg-orange-500 text-white' : 'bg-slate-200'
            }`}>
              {incident.severity}
            </div>
          </section>
          <section>
            <h3 className="text-xs font-black uppercase text-slate-400 mb-1">Thời gian báo cáo</h3>
            <p className="text-sm font-medium">{new Date(incident.reportedAt).toLocaleString('vi-VN')}</p>
          </section>
        </div>

        <div className="space-y-4">
          <section>
            <h3 className="text-xs font-black uppercase text-slate-400 mb-1">Người báo cáo</h3>
            <p className="text-sm font-bold uppercase">{incident.reporter?.fullName || incident.staffId}</p>
          </section>
          <section>
            <h3 className="text-xs font-black uppercase text-slate-400 mb-1">Trạng thái hiện tại</h3>
            <p className="text-sm font-bold uppercase text-blue-600">{incident.status}</p>
          </section>
          <section>
            <h3 className="text-xs font-black uppercase text-slate-400 mb-1">Địa điểm</h3>
            <p className="text-sm font-medium">{incident.location ? `${incident.location.lat}, ${incident.location.lon}` : 'Không xác định'}</p>
          </section>
        </div>
      </div>

      {/* Description */}
      <section className="bg-slate-50 p-6 rounded-lg mb-8 border border-slate-100">
        <h3 className="text-xs font-black uppercase text-slate-400 mb-3">Mô tả chi tiết</h3>
        <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{incident.description}</p>
      </section>

      {/* Resolution */}
      {incident.resolutionNotes && (
        <section className="bg-green-50 p-6 rounded-lg mb-8 border border-green-100">
          <h3 className="text-xs font-black uppercase text-green-600 mb-3">Thông tin xử lý</h3>
          <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{incident.resolutionNotes}</p>
          <p className="text-xs font-bold text-green-600 mt-4 uppercase">Đã giải quyết lúc: {new Date(incident.resolvedAt).toLocaleString('vi-VN')}</p>
        </section>
      )}

      {/* Footer / Signatures */}
      <div className="mt-16 grid grid-cols-2 gap-12 text-center pt-8 border-t border-slate-100">
        <div>
          <p className="text-xs font-bold uppercase text-slate-400 mb-12">Chữ ký người báo cáo</p>
          <div className="h-px bg-slate-200 w-48 mx-auto"></div>
          <p className="text-[10px] text-slate-400 mt-2 font-mono">{incident.reporter?.fullName || '---'}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-slate-400 mb-12">Xác nhận của quản lý</p>
          <div className="h-px bg-slate-200 w-48 mx-auto"></div>
          <p className="text-[10px] text-slate-400 mt-2 font-mono">SCMD PRO CERTIFIED</p>
        </div>
      </div>
    </div>
  );
};
