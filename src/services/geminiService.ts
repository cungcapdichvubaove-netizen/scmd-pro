import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface AnomalyResult {
  isAnomaly: boolean;
  reason: string;
  confidence: number;
}

/**
 * "The Watcher" - AI Anomaly Detection Service
 * Analyzes patrol data (GPS, Images) to detect suspicious behavior.
 */
export const analyzePatrolAnomaly = async (
  gpsTrajectory: { lat: number; lon: number; timestamp: string }[],
  imageUri?: string
): Promise<AnomalyResult> => {
  try {
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
      // Extract base64 data from URI
      const base64Data = imageUri.split(',')[1];
      contents.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Data
        }
      });
    }

    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: contents },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isAnomaly: { type: Type.BOOLEAN, description: "True nếu phát hiện bất thường" },
            reason: { type: Type.STRING, description: "Lý do chi tiết bằng tiếng Việt" },
            confidence: { type: Type.NUMBER, description: "Độ tin tưởng từ 0-1" }
          },
          required: ["isAnomaly", "reason", "confidence"]
        }
      }
    });

    // Lấy text từ response của Gemini
    const resultText = result.response.text();

    if (!resultText || typeof resultText !== 'string') {
      throw new Error("No response from Gemini");
    }

    return JSON.parse(resultText) as AnomalyResult;
  } catch (error) {
    console.error("The Watcher Analysis Error:", error);
    
    return {
      isAnomaly: false,
      reason: "Không thể phân tích dữ liệu bằng AI lúc này.",
      confidence: 0
    };
  }
};