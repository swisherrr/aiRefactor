export interface BaseAIService {
    refactorCode(code: string, optimizationGoal: string): Promise<string>;
}
