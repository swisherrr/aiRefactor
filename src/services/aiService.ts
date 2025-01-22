import Anthropic from '@anthropic-ai/sdk';
import * as vscode from 'vscode';

// Handles communication with AI services
// Integrates with Anthropic's Claude API for code refactoring
export class AIService {
    private anthropic: Anthropic;

    constructor() {
        const config = vscode.workspace.getConfiguration('aiCodeRefactorer');
        const apiKey = config.get<string>('anthropicApiKey') || '';
        if (!apiKey) {
            throw new Error('Anthropic API key not configured. Please add it in settings.');
        }
        this.anthropic = new Anthropic({ apiKey });
    }

    async refactorCode(code: string, optimizationGoal: string): Promise<string> {
        try {
            const prompt = `As a code refactoring assistant, improve this code for better ${optimizationGoal}.

CRITICAL INSTRUCTIONS:
1. Focus on STRUCTURAL improvements only:
   - Better variable names
   - Improved function organization
   - More efficient algorithms
   - Better design patterns
2. DO NOT:
   - Add documentation or comments
   - Add JSDoc
   - Change the core functionality
3. Only return the refactored code itself

Original code:

${code}`;

            const response = await this.anthropic.messages.create({
                model: 'claude-3-haiku-20240307',
                max_tokens: 1500,
                messages: [{ role: 'user', content: prompt }],
                system: "You are a code refactoring assistant focused on structural improvements only. Do not add comments or documentation."
            });

            if (response.content[0].type === 'text') {
                let refactoredCode = response.content[0].text;
                refactoredCode = refactoredCode.replace(/```[\w]*\n/g, '');
                refactoredCode = refactoredCode.replace(/```\n?/g, '');
                return refactoredCode.trim();
            }
            throw new Error('Unexpected response format from AI service');
        } catch (error: any) {
            console.error('Full error object:', error);
            console.error('AI Service error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            throw new Error(`Failed to refactor code: ${error.message}`);
        }
    }

    async explainRefactoring(originalCode: string, refactoredCode: string): Promise<string> {
        // TODO: Implement explanation generation
        return "Explanation of refactoring changes will be implemented here.";
    }
} 