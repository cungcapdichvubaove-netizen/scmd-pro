import { SecurityContext } from './types.js';

export abstract class BaseUseCase<TRequest, TResponse> {
  /**
   * Main entry point for use cases with mandatory security context.
   */
  public async execute(context: SecurityContext, request: TRequest): Promise<TResponse> {
    // 1. Authorize (Permission Bypass Check)
    await this.authorize(context, request);
    
    // 2. Validate Input
    await this.validate(request, context);
    
    // 3. Execute Core Logic
    return await this.internalExecute(context, request);
  }

  protected abstract authorize(context: SecurityContext, request: TRequest): Promise<void>;
  
  protected async validate(_request: TRequest, _context: SecurityContext): Promise<void> {
    // Default implementation (can be overridden with Zod etc.)
  }

  protected abstract internalExecute(context: SecurityContext, request: TRequest): Promise<TResponse>;
}
