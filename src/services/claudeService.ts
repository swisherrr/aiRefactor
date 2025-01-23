import Anthropic from '@anthropic-ai/sdk';
import * as vscode from 'vscode';
import { BaseAIService } from './baseAIService';

// Handles communication with AI services
// Integrates with Anthropic's Claude API for code refactoring
export class AIService implements BaseAIService {
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
            const prompt = `As a code refactoring assistant, analyze this code for ${optimizationGoal} improvements.

CRITICAL INSTRUCTIONS:
1. First, analyze if the code actually needs ${optimizationGoal} improvements
2. Only propose changes if there are SPECIFIC ${optimizationGoal} issues to fix
3. If no real ${optimizationGoal} issues exist, return the original code unchanged
4. For any changes you make, they must directly improve ${optimizationGoal}
5. Return only the code, no explanations

Security-specific guidelines:
- Only modify if there are actual vulnerabilities like:
  * Input validation gaps that could lead to crashes
  * Type coercion vulnerabilities
  * Buffer overflows
  * Code injection possibilities
  * Prototype pollution risks
- Don't modify for hypothetical edge cases
- Don't add type checks unless there's a clear security benefit
- Don't change working code that handles its edge cases safely

Performance-specific guidelines:
- Only modify if there are clear bottlenecks
- Don't optimize prematurely
- Only change algorithms if there's significant improvement

Readability-specific guidelines:
- Only modify if the code is actually unclear
- Don't change clear, working code
- Focus on genuine comprehension issues

Original code:
${code}`;

            const response = await this.anthropic.messages.create({
                model: 'claude-3-haiku-20240307',
                max_tokens: 1500,
                messages: [{ role: 'user', content: prompt }],
                system: "You are a conservative code refactoring assistant. Only suggest changes when there are clear and specific issues to fix. If the code is already well-written for the given goal, return 'NO_CHANGES_NEEDED'."
            });

            if (response.content[0].type === 'text') {
                let refactoredCode = response.content[0].text;
                // Clean up the response
                refactoredCode = refactoredCode.replace(/```[\w]*\n/g, '');
                refactoredCode = refactoredCode.replace(/```\n?/g, '');
                refactoredCode = refactoredCode.replace(/Here['']s the refactored code:?\n*/gi, '');
                refactoredCode = refactoredCode.trim();

                // Check if AI decided no changes were needed
                if (refactoredCode.includes('NO_CHANGES_NEEDED') || 
                    refactoredCode === code || 
                    refactoredCode.includes('recommend returning the original code unchanged')) {
                    vscode.window.showInformationMessage(`No refactoring needed - code is already optimized for ${optimizationGoal}`);
                    return code; // Return original code
                }

                return refactoredCode;
            }
            throw new Error('Unexpected response format from AI service');
        } catch (error: any) {
            console.error('AI Service error:', error);
            throw error;
        }
    }

    async explainRefactoring(originalCode: string, refactoredCode: string): Promise<string> {
        // TODO: Implement explanation generation
        return "Explanation of refactoring changes will be implemented here.";
    }
} 