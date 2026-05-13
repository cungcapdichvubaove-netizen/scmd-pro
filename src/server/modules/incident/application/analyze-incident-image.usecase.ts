import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { SecurityContext } from '../../../core/architecture/types.js';
import { GeminiService } from '../../../core/ai/gemini.service.js';

export interface AnalyzeIncidentImageInput {
  image: string; // base64
  description?: string;
}

export interface AnalyzeIncidentImageOutput {
  severity: 'Cao' | 'Trung bình' | 'Thấp';
  classification: string;
  advice: string;
  confidence: number;
}

export class AnalyzeIncidentImageUseCase extends BaseUseCase<AnalyzeIncidentImageInput, AnalyzeIncidentImageOutput> {
  override async authorize(context: SecurityContext): Promise<void> {
    if (!context.tenantId) throw new Error('UNAUTHORIZED');
  }

  override async validate(request: AnalyzeIncidentImageInput): Promise<void> {
    if (!request.image) throw new Error('BAD_REQUEST: Cần cung cấp hình ảnh để phân tích');
  }

  override async internalExecute(_ctx: SecurityContext, input: AnalyzeIncidentImageInput): Promise<AnalyzeIncidentImageOutput> {
    const analysis = await GeminiService.analyzeIncidentImage(input.image, input.description || '');

    return {
      severity: analysis.isHighSeverity ? 'Cao' : (analysis.confidence > 0.8 ? 'Trung bình' : 'Thấp'),
      classification: analysis.classification,
      advice: analysis.reason,
      confidence: analysis.confidence
    };
  }
}
