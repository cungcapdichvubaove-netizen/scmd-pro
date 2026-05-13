import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiFetch } from '../../../lib/api';
import { WatcherInsights } from './components/WatcherInsights';
import { SCMDLogo } from '../../common/interfaces/components/SCMDLogo';

export const WatcherPrintView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const printToken = searchParams.get('printToken');

  const [trustScore, setTrustScore] = useState<any>(null);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (printToken) {
      Promise.all([
        apiFetch(`/api/v1/tenant/monitor/trust-score?printToken=${printToken}`),
        apiFetch(`/api/v1/tenant/monitor/anomalies?printToken=${printToken}`)
      ])
        .then(([scoreData, anomaliesData]) => {
          setTrustScore(scoreData);
          setAnomalies(anomaliesData);
          setLoading(false);
          // Auto print format mapping
          setTimeout(() => {
            document.title = `SCMD_Watcher_Report_${new Date().toISOString().split('T')[0]}`;
          }, 1000);
        })
        .catch(err => {
          console.error('Failed to fetch watcher data for printing', err);
          setError('Không thể tải dữ liệu báo cáo');
          setLoading(false);
        });
    } else {
      setError('Missing print token');
      setLoading(false);
    }
  }, [printToken]);

  if (loading) return <div className="p-8 text-center text-white">Đang tải báo cáo...</div>;
  if (error) return <div className="p-8 text-red-500 font-bold">{error}</div>;

  const anomalyStats = {
    stationaryCount: 0,
    missedCount: 0,
    totalCount: anomalies.length,
    criticalCount: anomalies.filter(x => x.severity === 'CRITICAL').length
  };

  return (
    <div className="bg-[#020817] text-slate-100 p-8 min-h-screen font-sans" id="print-content">
      <div className="print-only mb-8 pb-4 border-b border-scmd-slate">
        <SCMDLogo />
        <h1 className="text-2xl font-bold text-white mt-4 tracking-tight">The Watcher AI - Security Audit Report</h1>
        <p className="text-sm text-scmd-silver/60">
          Generated automatically by SCMD Pro System on {new Date().toLocaleString()}
        </p>
      </div>

      <div className="w-full">
        {trustScore && (
          <WatcherInsights
            trustScore={trustScore}
            anomalies={anomalies}
            anomalyStats={anomalyStats}
            onFeedback={() => {}}
            isPrintMode={true}
          />
        )}
      </div>

      <div className="print-only mt-16 pt-8 border-t border-scmd-slate text-xs text-scmd-silver/40 text-center">
        This document contains confidential security audit information. Do not distribute without authorization.
        <br />
        SCMD Pro - Enterprise Security Management System
      </div>
    </div>
  );
};
