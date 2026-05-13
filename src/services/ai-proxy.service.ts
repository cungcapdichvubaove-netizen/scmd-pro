/**
 * 📍 SCMD AI PROXY SERVICE
 * 
 * ⚠️ PHIÊN BẢN BẢO MẬT v3.7.0
 * 
 * [RULE]: Proxy to backend only — NO AI SDK import allowed in this file.
 * File này chỉ đóng vai trò trung gian (Proxy) để gọi API AI từ Backend. 
 * Tuyệt đối KHÔNG import @google/generative-ai tại đây để tránh lộ API Key.
 * 
 * "The Watcher" - AI Anomaly Detection Service (Resilient Proxy)
 * Calls the backend which implements Circuit Breakers (opossum) 
 * and fallback logic for increased system resilience.
 */

import { apiFetch } from "../lib/api";

export interface AnomalyResult {
  isAnomaly: boolean;
  reason: string;
  confidence: number;
}

export interface BehaviorAnomaly {
  staffId: string;
  type: 'speed' | 'missed' | 'pattern' | 'fraud';
  description: string;
  severity: 'low' | 'medium' | 'high';
  suggestedAction: string;
}

export interface PatrolAnalysisResult {
  anomalyScore: number;
  reason: string;
  deviations: string[];
}

export const analyzePatrolAnomaly = async (
  gpsTrajectory: { lat: number; lon: number; timestamp: string }[],
  imageUri?: string
): Promise<AnomalyResult> => {
  try {
    return await apiFetch('/api/ai/analyze-patrol', {
      method: 'POST',
      body: JSON.stringify({ gpsTrajectory, imageUri })
    });
  } catch (error) {
    console.error("Gemini Proxy Analysis Error:", error);
    return {
      isAnomaly: true, // Fail safe: manual review
      reason: "⚠️ Không thể kết nối với dịch vụ AI. Bản tin này được chuyển sang trạng thái: CHỜ DUYỆT THỦ CÔNG.",
      confidence: 0
    };
  }
};

/**
 * Patrol Log Detailed Analysis Proxy
 */
export const analyzePatrolLog = async (
  logData: any,
  checkpoint: any
): Promise<PatrolAnalysisResult> => {
  try {
    return await apiFetch('/api/ai/analyze-log', {
      method: 'POST',
      body: JSON.stringify({ logData, checkpoint })
    });
  } catch (error) {
    console.error("Gemini Proxy Log Analysis Error:", error);
    return {
      anomalyScore: 0,
      reason: "⚠️ Hệ thống AI hiện không khả dụng. Nhật ký này sẽ được kiểm tra lại sau.",
      deviations: ["Lỗi kết nối dịch vụ AI"]
    };
  }
};

/**
 * Behavior Analysis Proxy
 */
export const analyzeBehaviorAnomaly = async (
  logs: any[],
  checkpoints: any[],
  staffList: any[]
): Promise<BehaviorAnomaly[]> => {
  try {
    return await apiFetch('/api/ai/analyze-behavior', {
      method: 'POST',
      body: JSON.stringify({ logs, checkpoints, staffList })
    });
  } catch (error) {
    console.error("Gemini Proxy Behavior Analysis Error:", error);
    return [];
  }
};

/**
 * AI Subdomain Suggestion Proxy
 */
export const suggestSubdomain = async (companyName: string): Promise<string> => {
  try {
    const data = await apiFetch('/api/ai/suggest-subdomain', {
      method: 'POST',
      body: JSON.stringify({ companyName })
    });

    return data.subdomain;
  } catch (error) {
    console.error("Gemini Proxy Subdomain Suggest Error:", error);
    return companyName.toLowerCase().replace(/\s+/g, '');
  }
};
