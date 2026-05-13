import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import CircuitBreaker from 'opossum';
import { logger } from '../logger/index.js';
import { metrics } from '../metrics.js';

let genAI: GoogleGenerativeAI | null = null;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

// FIX [STARTUP]: Check GEMINI_API_KEY at module load time in production
// to surface misconfiguration immediately rather than at first AI call.
if (!process.env.GEMINI_API_KEY && process.env.NODE_ENV === 'production') {
  logger.warn("[GeminiService] GEMINI_API_KEY is not set. All AI features will use Circuit Breaker fallback.");
}

function getAIModel(config?: any) {
  if (!genAI) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      logger.error("GEMINI_API_KEY environment variable is required");
    }
    genAI = new GoogleGenerativeAI(key || 'dummy');
  }
  return genAI.getGenerativeModel({ model: GEMINI_MODEL, ...config });
}

export interface AnomalyResult {
  isAnomaly: boolean;
  reason: string;
  confidence: number;
}

export interface PatrolAnalysisResult {
  anomalyScore: number;
  reason: string;
  deviations: string[];
}

export interface MonthlyAnalysisData {
  tenantId: string;
  attendanceStats: {
    total: number;
    validCount: number;
    invalidCount: number;
    dailyTrends: Array<{ date: string; count: number }>;
  };
  patrolStats: {
    total: number;
    dailyTrends: Array<{ date: string; count: number }>;
    uniqueCheckpoints: number;
  };
  incidentStats: {
    total: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
  };
  staffCount: number;
  month: string;
}

export interface StrategyInsight {
  summary: string;
  fraudRiskScore: number;
  fraudDetails: string[];
  efficiencyScore: number;
  topPerformers: string[];
  criticalIssues: string[];
  recommendations: string[];
}

export interface BehaviorAnomaly {
  staffId: string;
  type: 'speed' | 'missed' | 'pattern' | 'fraud';
  description: string;
  severity: 'low' | 'medium' | 'high';
  suggestedAction: string;
}

export interface BlindSpotAnalysis {
  blindSpots: Array<{
    locationId: string;
    locationName: string;
    riskLevel: 'low' | 'medium' | 'high';
    reason: string;
  }>;
  dynamicRouteSuggestions: Array<{
    sequence: string[];
    benefit: string;
  }>;
  predictionConfidence: number;
}

export interface IncidentImageAnalysisResult {
  isHighSeverity: boolean;
  classification: string;
  confidence: number;
  reason: string;
}

// ─── Internal async functions ─────────────────────────────────────────────────

async function analyzeIncidentImageInternal(imageUri: string, description: string): Promise<IncidentImageAnalysisResult> {
  const prompt = `
    Bạn là "The Watcher" - Hệ thống AI phân tích an ninh.
    Hãy phân tích hình ảnh và mô tả sau đây của một sự cố an ninh.
    
    Mô tả sự cố: "${description}"
    
    Nhiệm vụ:
    1. Phân loại sự cố (ví dụ: cháy nổ, tai nạn, trộm cắp, vi phạm nội quy, v.v.).
    2. Xác định xem sự cố có thuộc mức độ "Nghiêm trọng" (High Severity) hay không dựa trên hình ảnh. Những trường hợp có dấu hiệu cháy nổ, máu, vũ khí, trộm cắp, hoặc xâm phạm nghiêm trọng sẽ bị coi là Nghiêm trọng.
    3. Đưa ra lý do phân loại.
    
    Trả về kết quả dưới dạng JSON. Ngôn ngữ: Tiếng Việt.
  `;

  const contents: any[] = [{ text: prompt }];
  
  if (imageUri) {
    let base64Data = '';
    if (imageUri.startsWith('http')) {
      // Fetch the image to get base64
      try {
        const res = await fetch(imageUri);
        const buffer = await res.arrayBuffer();
        base64Data = Buffer.from(buffer).toString('base64');
      } catch (err) {
        logger.error({ err, imageUri }, 'Failed to fetch image for AI analysis');
      }
    } else {
      base64Data = imageUri.includes(',') ? (imageUri.split(',')[1] || '') : imageUri;
    }

    if (base64Data) {
      contents.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Data
        }
      });
    }
  }

  const model = getAIModel({
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          isHighSeverity: { type: SchemaType.BOOLEAN, description: "True nếu là sự cố nghiêm trọng ảnh hưởng đến an ninh hoặc an toàn" },
          classification: { type: SchemaType.STRING, description: "Phân loại sự cố" },
          reason: { type: SchemaType.STRING, description: "Lý do chi tiết bằng tiếng Việt" },
          confidence: { type: SchemaType.NUMBER, description: "Độ tin tưởng từ 0-1" }
        },
        required: ["isHighSeverity", "classification", "reason", "confidence"]
      }
    }
  });

  const response = await model.generateContent({
    contents: [{ role: 'user', parts: contents }]
  });

  const text = response.response.text();
  if (!text) throw new Error("Empty response from Gemini");

  return JSON.parse(text);
}

async function predictPatrolBlindSpotsInternal(
  patrolData: any[],
  checkpoints: any[]
): Promise<BlindSpotAnalysis> {
  const prompt = `
    Bạn là "The Predictive Guardian" - Chuyên gia phòng ngừa tội phạm sử dụng AI.
    Dựa trên lịch sử tuần tra 7 ngày qua, hãy xác định các "điểm mù" (blind spots) nơi quy luật tuần tra quá đơn điệu, dễ bị kẻ gian bắt bài.
    
    Dữ liệu lịch sử: ${JSON.stringify(patrolData.slice(-50))}
    Danh sách điểm: ${JSON.stringify(checkpoints.map(c => ({ id: c.id, name: c.name })))}
    
    YÊU CẦU:
    1. Tìm các điểm thường xuyên được tuần tra vào khung giờ cố định (sai số < 5 phút).
    2. Chỉ ra các điểm có khoảng cách thời gian giữa 2 lần tuần tra quá dài (> 2 tiếng).
    3. Đề xuất ít nhất 2 lộ trình tuần tra thay đổi (Dynamic Routes) để phá vỡ quy luật hiện tại.
    
    Trả về JSON. Ngôn ngữ: Tiếng Việt.
  `;

  const model = getAIModel({
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          blindSpots: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                locationId: { type: SchemaType.STRING },
                locationName: { type: SchemaType.STRING },
                riskLevel: { type: SchemaType.STRING, enum: ['low', 'medium', 'high'] },
                reason: { type: SchemaType.STRING }
              },
              required: ["locationId", "locationName", "riskLevel", "reason"]
            }
          },
          dynamicRouteSuggestions: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                sequence: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                benefit: { type: SchemaType.STRING }
              },
              required: ["sequence", "benefit"]
            }
          },
          predictionConfidence: { type: SchemaType.NUMBER }
        },
        required: ["blindSpots", "dynamicRouteSuggestions", "predictionConfidence"]
      }
    }
  });

  const response = await model.generateContent(prompt);
  const text = response.response.text();
  if (!text) throw new Error("AI Prediction failed");
  
  return JSON.parse(text);
}

async function analyzePatrolAnomalyInternal(
  gpsTrajectory: { lat: number; lon: number; timestamp: string }[],
  imageUri?: string
): Promise<AnomalyResult> {
  const prompt = `
    Bạn là "The Watcher" - Hệ thống AI giám sát an ninh cao cấp.
    Hãy phân tích dữ liệu tuần tra sau đây để tìm điểm bất thường:
    
    1. Quỹ đạo GPS: ${JSON.stringify(gpsTrajectory)}
    2. Hình ảnh báo cáo: ${imageUri ? "Đã cung cấp" : "Không có"}
    
    Các tiêu chí kiểm tra:
    - Tốc độ di chuyển: Nếu khoảng cách giữa các điểm GPS quá lớn trong thời gian ngắn (ví dụ: di chuyển > 20km/h trong tòa nhà), đó là bất thường.
    - Tính trung thực: Nếu hình ảnh không khớp với vị trí GPS hoặc có dấu hiệu giả mạo.
    
    Trả về kết quả dưới dạng JSON.
  `;

  const contents: any[] = [{ text: prompt }];
  
  if (imageUri) {
    const base64Data = imageUri.includes(',') ? imageUri.split(',')[1] : imageUri;
    contents.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: base64Data
      }
    });
  }

  const model = getAIModel({
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          isAnomaly: { type: SchemaType.BOOLEAN, description: "True nếu phát hiện bất thường" },
          reason: { type: SchemaType.STRING, description: "Lý do chi tiết bằng tiếng Việt" },
          confidence: { type: SchemaType.NUMBER, description: "Độ tin tưởng từ 0-1" }
        },
        required: ["isAnomaly", "reason", "confidence"]
      }
    }
  });

  const response = await model.generateContent({
    contents: [{ role: 'user', parts: contents }]
  });

  const text = response.response.text();
  if (!text) throw new Error("Empty response from Gemini");

  return JSON.parse(text);
}

async function analyzeMonthlyStrategyInternal(data: MonthlyAnalysisData): Promise<StrategyInsight> {
  const prompt = `
    Bạn là "The Chief Strategist" - Chuyên gia tư vấn cấp cao cho các công ty dịch vụ bảo vệ.
    Nhiệm vụ: Phân tích báo cáo tháng ${data.month} để tối ưu hóa vận hành và giảm thiểu rủi ro.

    TÓM TẮT DỮ LIỆU (Tháng ${data.month}):
    1. NHÂN SỰ: ${data.staffCount} nhân viên.
    2. CHẤM CÔNG:
       - Tổng lượt: ${data.attendanceStats.total}
       - Hợp lệ: ${data.attendanceStats.validCount} | Không hợp lệ: ${data.attendanceStats.invalidCount}
       - Xu hướng hàng ngày: ${JSON.stringify(data.attendanceStats.dailyTrends)}
    3. TUẦN TRA:
       - Tổng lượt: ${data.patrolStats.total}
       - Số điểm kiểm soát đã phủ: ${data.patrolStats.uniqueCheckpoints}
       - Xu hướng hàng ngày: ${JSON.stringify(data.patrolStats.dailyTrends)}
    4. SỰ CỐ:
       - Tổng số vụ: ${data.incidentStats.total}
       - Phân loại mức độ: ${JSON.stringify(data.incidentStats.bySeverity)}
       - Phân loại loại hình: ${JSON.stringify(data.incidentStats.byType)}

    HÃY PHÂN TÍCH VÀ ĐƯA RA CHIẾN LƯỢC:
    1. Đánh giá rủi ro gian lận (Fraud Risk) dựa trên tỷ lệ chấm công không hợp lệ và biến động tuần tra.
    2. Đánh giá hiệu quả vận hành (Efficiency).
    3. Đề xuất cải tiến cụ thể cho tháng tới.

    TRẢ VỀ JSON CHI TIẾT. Ngôn ngữ: Tiếng Việt văn phong chuyên nghiệp.
  `;

  const model = getAIModel({
    generationConfig: {
      responseMimeType: "application/json",
      maxOutputTokens: 2048, // GAP H: Cap response size for cost and latency control
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          summary: { type: SchemaType.STRING },
          fraudRiskScore: { type: SchemaType.NUMBER },
          fraudDetails: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          efficiencyScore: { type: SchemaType.NUMBER },
          topPerformers: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          criticalIssues: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          recommendations: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
        },
        required: ["summary", "fraudRiskScore", "fraudDetails", "efficiencyScore", "topPerformers", "criticalIssues", "recommendations"]
      }
    }
  });

  // Use AbortController for strict timeout if SDK doesn't handle it gracefully via config
  const response = await model.generateContent(prompt);
  const text = response.response.text() ?? '{}';
  return JSON.parse(text);
}

async function analyzeBehaviorAnomalyInternal(
  logs: any[],
  checkpoints: any[],
  staffList: any[]
): Promise<BehaviorAnomaly[]> {
  const prompt = `
    Bạn là "The Behavioral Analyst" - Chuyên viên phân tích tâm lý và hành vi nhân sự.
    Hãy phân tích các nhật ký hoạt động sau để tìm các dấu hiệu gian lận hoặc thiếu chuyên nghiệp:
    
    1. Logs: ${JSON.stringify(logs.slice(0, 20))}... (Trích đoạn)
    2. Điểm kiểm soát: ${checkpoints.length} điểm.
    3. Nhân sự: ${staffList.length} người.
    
    Trả về mảng JSON chứa các đối tượng BehaviorAnomaly.
  `;

  const model = getAIModel({
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            staffId: { type: SchemaType.STRING },
            type: { type: SchemaType.STRING, enum: ['speed', 'missed', 'pattern', 'fraud'] },
            description: { type: SchemaType.STRING },
            severity: { type: SchemaType.STRING, enum: ['low', 'medium', 'high'] },
            suggestedAction: { type: SchemaType.STRING }
          },
          required: ["staffId", "type", "description", "severity", "suggestedAction"]
        }
      }
    }
  });

  const response = await model.generateContent(prompt);
  const text = response.response.text() ?? '[]';
  return JSON.parse(text);
}

async function analyzePatrolLogInternal(
  logData: any,
  checkpoint: any
): Promise<PatrolAnalysisResult> {
  const prompt = `
    Bạn là "The Watcher" - Hệ thống AI giám sát an ninh cao cấp cho dự án SCMD Pro.
    Hãy phân tích bản ghi tuần tra này để tìm điểm bất thường và sai lệch lộ trình.

    DỮ LIỆU NHẬT KÝ TUẦN TRA:
    - Mã nhật ký: ${logData.id}
    - Thời gian bắt đầu: ${logData.startTime}
    - Thời gian kết thúc: ${logData.endTime}
    - Thời gian thực hiện: ${logData.durationSeconds} giây
    - Vị trí quét QR: lat: ${logData.metadata?.location?.latitude || logData.metadata?.location?.lat}, lon: ${logData.metadata?.location?.longitude || logData.metadata?.location?.lon}
    
    THÔNG TIN ĐIỂM KIỂM SOÁT (TARGET):
    - Tên điểm: ${checkpoint?.name}
    - Vị trí định mức: lat: ${checkpoint?.latitude}, lon: ${checkpoint?.longitude}
    
    CÁC MỤC KIỂM TRA (CHECKLIST):
    ${JSON.stringify(logData.checkItemsData)}

    YÊU CẦU PHÂN TÍCH:
    1. "Điểm bất thường của bảo vệ": Kiểm tra xem thời gian thực hiện có quá nhanh hay quá chậm bất thường không. Kiểm tra tính hợp lệ của checklist.
    2. "Sai lệch lộ trình": So sánh vị trí quét QR thực tế so với vị trí định mức của điểm kiểm soát. Nếu lệch > 50m, coi là sai lệch.
    
    Trả về kết quả dưới dạng JSON. Ngôn ngữ: Tiếng Việt.
  `;

  const model = getAIModel({
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          anomalyScore: { 
            type: SchemaType.NUMBER, 
            description: "Chỉ số nghi vấn từ 0-100. Càng cao càng rủi ro." 
          },
          reason: { 
            type: SchemaType.STRING, 
            description: "Tóm tắt kết luận phân tích bằng tiếng Việt." 
          },
          deviations: { 
            type: SchemaType.ARRAY, 
            items: { type: SchemaType.STRING },
            description: "Danh sách các điểm sai lệch lộ trình hoặc hành vi phát hiện được."
          }
        },
        required: ["anomalyScore", "reason", "deviations"]
      }
    }
  });

  const response = await model.generateContent(prompt);
  const text = response.response.text();
  if (!text) throw new Error("AI không trả về kết quả.");
  
  return JSON.parse(text);
}

async function suggestSubdomainInternal(companyName: string): Promise<string> {
  const prompt = `Bạn là chuyên gia hệ thống SaaS. Hãy tạo một subdomain duy nhất, ngắn gọn, chuyên nghiệp (chỉ dùng chữ thường, không dấu, không khoảng trắng, không ký tự đặc biệt) cho công ty bảo vệ có tên: "${companyName}". Trả về duy nhất chuỗi subdomain (ví dụ: baoveanbinh).`;
  const model = getAIModel();
  const response = await model.generateContent(prompt);
  return response.response.text()?.trim().toLowerCase() || companyName.toLowerCase().replace(/\s+/g, '');
}

// ─── Circuit Breaker Configuration ───────────────────────────────────────────

const fastBreakerOptions = {
  timeout: 10000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
};

const batchBreakerOptions = {
  timeout: 60000,
  errorThresholdPercentage: 50,
  resetTimeout: 60000
};

const anomalyBreaker = new CircuitBreaker(analyzePatrolAnomalyInternal, fastBreakerOptions);

// Metrics Bridge
const registerBreakerMetrics = (breaker: CircuitBreaker, name: string) => {
  breaker.on('open', () => metrics.updateCircuitBreaker(name, 'open'));
  breaker.on('close', () => metrics.updateCircuitBreaker(name, 'closed'));
  breaker.on('halfOpen', () => metrics.updateCircuitBreaker(name, 'half-open'));
  // Initial state sync
  metrics.updateCircuitBreaker(name, breaker.opened ? 'open' : 'closed');
};

registerBreakerMetrics(anomalyBreaker, 'ai_anomaly');

anomalyBreaker.fallback(() => {
  logger.warn('Gemini Circuit Breaker OPEN: Falling back to manual review state.');
  return {
    isAnomaly: true,
    reason: "⚠️ Hệ thống AI đang tạm nghỉ để bảo trì. Bản tin này được chuyển sang trạng thái: CHỜ DUYỆT THỦ CÔNG.",
    confidence: 0
  };
});

anomalyBreaker.on('open', () => {
  logger.error('🚨 [CRITICAL] Gemini Anomaly Circuit Breaker is OPEN. Notifying admins...');
  // Dynamic import to avoid circular dependency and respect ESM
  import('../../infra/zalo/service.js').then(({ ZaloService }) => {
    ZaloService.notifyAdmins('SYSTEM', '🚨 [CRITICAL] AI Watcher Circuit Breaker OPEN. Hệ thống đang chuyển sang chế độ DUYỆT THỦ CÔNG.', async () => {
      // Logic lấy admin hệ thống hoặc admin của tất cả tenant đang active (tùy policy)
      // Ở đây ta log trước, thực tế sẽ query admin list
      return []; 
    }).catch(e => logger.error({ err: e.message }, 'Failed to notify admins about breaker open'));
  });
});

anomalyBreaker.on('close', () => {
  logger.info('✅ Gemini Anomaly Circuit Breaker CLOSED. AI service restored.');
});

const behaviorBreaker = new CircuitBreaker(analyzeBehaviorAnomalyInternal, fastBreakerOptions);
registerBreakerMetrics(behaviorBreaker, 'ai_behavior');
behaviorBreaker.on('open', () => logger.warn('Behavior Anomaly Breaker OPEN'));
behaviorBreaker.fallback(() => []);

const patrolLogBreaker = new CircuitBreaker(analyzePatrolLogInternal, fastBreakerOptions);
registerBreakerMetrics(patrolLogBreaker, 'ai_patrol_log');
patrolLogBreaker.on('open', () => logger.warn('Patrol Log Breaker OPEN'));
patrolLogBreaker.fallback(() => ({
  anomalyScore: 0,
  reason: "⚠️ Hệ thống AI hiện không khả dụng. Nhật ký này sẽ được kiểm tra lại sau.",
  deviations: ["Circuit Breaker OPEN"]
}));

const strategyBreaker = new CircuitBreaker(analyzeMonthlyStrategyInternal, batchBreakerOptions);
registerBreakerMetrics(strategyBreaker, 'ai_strategy');
strategyBreaker.on('open', () => logger.warn('Strategy Breaker OPEN'));
strategyBreaker.fallback(() => ({
  summary: "Sẵn sàng phân tích dữ liệu tháng...",
  fraudRiskScore: 0,
  fraudDetails: ["Hệ thống AI đang được bảo trì."],
  efficiencyScore: 0,
  topPerformers: [],
  criticalIssues: ["Không thể kết nối AI lúc này"],
  recommendations: ["Vui lòng kiểm tra lại cấu hình API."]
}));

const blindSpotBreaker = new CircuitBreaker(predictPatrolBlindSpotsInternal, batchBreakerOptions);
registerBreakerMetrics(blindSpotBreaker, 'ai_blind_spot');
blindSpotBreaker.on('open', () => logger.warn('Blind Spot Breaker OPEN'));
blindSpotBreaker.fallback(() => ({
  blindSpots: [],
  dynamicRouteSuggestions: [],
  predictionConfidence: 0
}));

const incidentImageBreaker = new CircuitBreaker(analyzeIncidentImageInternal, fastBreakerOptions);
registerBreakerMetrics(incidentImageBreaker, 'ai_incident_image');
incidentImageBreaker.on('open', () => logger.warn('Incident Image Breaker OPEN'));
incidentImageBreaker.fallback(() => ({
  isHighSeverity: false,
  classification: "Unknown",
  reason: "⚠️ Hệ thống AI hiện không khả dụng. Sự cố sẽ tự động phân loại dựa trên văn bản.",
  confidence: 0
}));

const subdomainBreaker = new CircuitBreaker(suggestSubdomainInternal, fastBreakerOptions);
registerBreakerMetrics(subdomainBreaker, 'ai_subdomain');
subdomainBreaker.fallback((companyName: string) => companyName.toLowerCase().replace(/\s+/g, ''));

// ─── Public API — exported AFTER all breakers are initialized ─────────────────
import { CacheManager } from '../cache/manager.js';

export const GeminiService = {
  analyzePatrolAnomaly: (gps: any[], img?: string) => anomalyBreaker.fire(gps, img) as Promise<AnomalyResult>,
  analyzePatrolLog: (logData: any, checkpoint: any) => patrolLogBreaker.fire(logData, checkpoint) as Promise<PatrolAnalysisResult>,
  analyzeBehaviorAnomaly: (logs: any[], checkpoints: any[], staffList: any[]) => behaviorBreaker.fire(logs, checkpoints, staffList) as Promise<BehaviorAnomaly[]>,
  analyzeMonthlyStrategy: async (data: MonthlyAnalysisData) => {
    // FIX [P3]: Advanced Caching Policy for AI Insights
    // Key format: ai:monthly:${tenantId}:${month}
    const cacheKey = `ai:monthly:${data.tenantId}:${data.month}`;
    
    // Calculate TTL: Current month = 24h, Past months = 30 days
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const ttlSeconds = data.month === currentMonthStr 
      ? 86400  // 24h
      : 2592000; // 30 days
      
    return await CacheManager.wrap(cacheKey, () => strategyBreaker.fire(data) as Promise<StrategyInsight>, ttlSeconds);
  },
  predictBlindSpots: (patrolData: any[], checkpoints: any[]) => blindSpotBreaker.fire(patrolData, checkpoints) as Promise<BlindSpotAnalysis>,
  analyzeIncidentImage: (imageUri: string, description: string) => incidentImageBreaker.fire(imageUri, description) as Promise<IncidentImageAnalysisResult>,
  suggestSubdomain: (companyName: string) => subdomainBreaker.fire(companyName) as Promise<string>
};
