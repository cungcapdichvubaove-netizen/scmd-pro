import { create } from 'zustand';
import { PatrolLog, Checkpoint } from '../interfaces/types';

export interface ConfirmModalData {
  type: 'checkpoint' | 'staff' | 'route' | string;
  id: string;
  name: string;
}

export interface MapPointData {
  name: string;
  lat: number;
  lon: number;
  status: string;
  type?: string;
  description?: string;
  lastPatrol?: {
    staff: string;
    time: string;
  };
}

export interface LogAnalysisResult {
  anomalyScore: number;
  reason: string;
  deviations?: string[];
}

interface ModalState {
  // Confirm Modal
  showConfirmModal: ConfirmModalData | null;
  setShowConfirmModal: (data: ConfirmModalData | null) => void;
  confirmText: string;
  setConfirmText: (text: string) => void;

  // Welcome Modal
  showWelcomeModal: boolean;
  setShowWelcomeModal: (show: boolean) => void;

  // Map Point Modal
  selectedMapPoint: MapPointData | null;
  setSelectedMapPoint: (point: MapPointData | null) => void;

  // Log Detail Modal
  selectedLog: PatrolLog | null;
  setSelectedLog: (log: PatrolLog | null) => void;
  isAnalyzingLog: boolean;
  setIsAnalyzingLog: (isAnalyzing: boolean) => void;
  analysisResult: LogAnalysisResult | null;
  setAnalysisResult: (result: LogAnalysisResult | null) => void;

  // QR Modal
  showQRModal: Checkpoint | null;
  setShowQRModal: (cp: Checkpoint | null) => void;
}

export const useModalStore = create<ModalState>((set) => ({
  showConfirmModal: null,
  setShowConfirmModal: (data) => set({ showConfirmModal: data, confirmText: '' }),
  confirmText: '',
  setConfirmText: (text) => set({ confirmText: text }),

  showWelcomeModal: false,
  setShowWelcomeModal: (show) => set({ showWelcomeModal: show }),

  selectedMapPoint: null,
  setSelectedMapPoint: (point) => set({ selectedMapPoint: point }),

  selectedLog: null,
  setSelectedLog: (log) => set({ selectedLog: log }),
  isAnalyzingLog: false,
  setIsAnalyzingLog: (isAnalyzing) => set({ isAnalyzingLog: isAnalyzing }),
  analysisResult: null,
  setAnalysisResult: (result) => set({ analysisResult: result }),

  showQRModal: null,
  setShowQRModal: (cp) => set({ showQRModal: cp }),
}));
