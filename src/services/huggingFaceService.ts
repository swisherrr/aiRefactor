/// <reference lib="dom" />

import { HfInference } from '@huggingface/inference';
import * as vscode from 'vscode';
import { BaseAIService } from './baseAIService';

export class HuggingFaceService implements BaseAIService {
    private hf: HfInference;

    constructor() {
        try {
            const config = vscode.workspace.getConfiguration('aiCodeRefactorer');
            const apiKey = config.get<string>('huggingfaceApiKey') || '';
            console.log('HF Key exists:', !!apiKey); // Will log true/false without exposing the key
            console.log('HF Key starts with:', apiKey.substring(0, 3)); // Show just the start to verify format
            if (!apiKey) {
                throw new Error('HuggingFace API key not configured. Please add it in settings.');
            }
            if (!apiKey.startsWith('hf_')) {
                throw new Error('Invalid HuggingFace API key format. Key should start with "hf_"');
            }
            this.hf = new HfInference(apiKey);
        } catch (error) {
            console.error('HuggingFace service initialization error:', error);
            throw error;
        }
    }

    async refactorCode(code: string, optimizationGoal: string): Promise<string> {
        try {
            const response = await this.hf.textGeneration({
                model: 'bigcode/santacoder',  // Code-specific model
                inputs: `// Original code:
${code}

// Task: Refactor the above code to improve ${optimizationGoal}.
// Return NO_CHANGES_NEEDED if no improvements are needed.
// Only output the refactored code, no explanations.

// Refactored code:`,
                parameters: {
                    max_new_tokens: 200,
                    temperature: 0.2,
                    top_p: 0.95,
                    return_full_text: false,
                    do_sample: true,
                    stop: ['// End']
                }
            });
            
            console.log('HF Response:', response);
            let refactoredCode = response.generated_text.trim();
            console.log('Refactored code:', refactoredCode);

            if (refactoredCode.includes('NO_CHANGES_NEEDED') || refactoredCode === code) {
                vscode.window.showInformationMessage(`No refactoring needed - code is already optimized for ${optimizationGoal}`);
                return code;
            }

            return refactoredCode;
        } catch (error: any) {
            console.error('HuggingFace error details:', {
                error,
                message: error.message,
                stack: error.stack,
                response: error.response
            });
            throw error;
        }
    }
}