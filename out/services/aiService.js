"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIService = void 0;
const sdk_1 = require("@anthropic-ai/sdk");
const vscode = require("vscode");
// Handles communication with AI services
// Integrates with Anthropic's Claude API for code refactoring
class AIService {
    constructor() {
        const config = vscode.workspace.getConfiguration('aiCodeRefactorer');
        const apiKey = config.get('anthropicApiKey') || '';
        if (!apiKey) {
            throw new Error('Anthropic API key not configured. Please add it in settings.');
        }
        this.anthropic = new sdk_1.default({ apiKey });
    }
    async refactorCode(code, optimizationGoal) {
        try {
            const prompt = `As a code refactoring assistant, improve this code for better ${optimizationGoal}.
CRITICAL INSTRUCTIONS:
1. Only return the refactored code with NO explanations or extra text
2. Do not include phrases like "Here's the refactored code:"
3. Only return valid, working code
4. Keep the same scope as the original code

Original code:
${code}`;
            const response = await this.anthropic.messages.create({
                model: 'claude-3-haiku-20240307',
                max_tokens: 1500,
                messages: [{ role: 'user', content: prompt }],
                system: "You are a code refactoring assistant. Return ONLY the refactored code with no additional text or explanations."
            });
            if (response.content[0].type === 'text') {
                let refactoredCode = response.content[0].text;
                // Remove markdown code blocks and any explanatory text
                refactoredCode = refactoredCode.replace(/```[\w]*\n/g, '');
                refactoredCode = refactoredCode.replace(/```\n?/g, '');
                refactoredCode = refactoredCode.replace(/Here['']s the refactored code:?\n*/gi, '');
                refactoredCode = refactoredCode.trim();
                return refactoredCode;
            }
            throw new Error('Unexpected response format from AI service');
        }
        catch (error) {
            console.error('AI Service error:', error);
            throw error;
        }
    }
    async explainRefactoring(originalCode, refactoredCode) {
        // TODO: Implement explanation generation
        return "Explanation of refactoring changes will be implemented here.";
    }
}
exports.AIService = AIService;
//# sourceMappingURL=aiService.js.map