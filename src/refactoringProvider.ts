import * as vscode from 'vscode';
import { AIService } from './services/claudeService';

// Manages the refactoring logic and configuration
// Acts as a bridge between VS Code and the AI service

export class RefactoringProvider {
    constructor(private aiService: AIService) {}

    async refactorCode(code: string): Promise<string> {
        try {
            // Get configuration
            const config = vscode.workspace.getConfiguration('aiCodeRefactorer');
            const optimizationGoal = config.get<string>('optimizationGoal', 'readability');

            // Send to AI service for refactoring
            const refactoredCode = await this.aiService.refactorCode(code, optimizationGoal);
            return refactoredCode;
        } catch (error) {
            console.error('Refactoring error:', error);
            throw error;
        }
    }
} 