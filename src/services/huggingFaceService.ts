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

    async addComments(code: string): Promise<string> {
        try {
            // First get comments for the code
            const commentResponse = await this.hf.textGeneration({
                model: 'gpt2',
                inputs: `Add comments to explain this JavaScript code:
${code}

Comments:`,
                parameters: {
                    max_new_tokens: 100,
                    temperature: 0.3,
                    top_p: 0.95,
                    return_full_text: false
                }
            });

            let generatedComments = commentResponse.generated_text.trim();
            console.log('Generated comments:', generatedComments);

            // Clean up the comments
            const comments = generatedComments
                .split('\n')
                .map((line: string) => line.startsWith('//') ? line : `// ${line}`)
                .filter((line: string) => line.length > 3) // Remove very short comments
                .join('\n');

            if (comments) {
                return `${comments}\n\n${code}`;
            }

            vscode.window.showInformationMessage('Could not generate meaningful comments.');
            return code;
        } catch (error: any) {
            console.error('HuggingFace error details:', error);
            vscode.window.showErrorMessage('Failed to generate comments. Using original code.');
            return code;
        }
    }

    async completeCode(code: string): Promise<string> {
        try {
            const response = await this.hf.textGeneration({
                model: 'bigcode/santacoder',
                inputs: `/* JavaScript implementation needed.
Input: Function signature and comments
${code}

Output: Complete implementation */

`,
                parameters: {
                    max_new_tokens: 200,
                    temperature: 0.1,
                    top_p: 0.95,
                    return_full_text: false,
                    do_sample: true,
                    stop: ['/*', '*/', '```']
                }
            });
            
            let completedCode = response.generated_text.trim();
            console.log('Generated code:', completedCode);

            // Extract just the function implementation
            const functionMatch = completedCode.match(/function\s+\w+\s*\([^)]*\)\s*{[\s\S]*?}/);
            if (functionMatch) {
                completedCode = functionMatch[0];
            }

            if (!completedCode || completedCode === code) {
                vscode.window.showInformationMessage('Could not generate code completion');
                return code;
            }

            return completedCode;
        } catch (error: any) {
            console.error('HuggingFace error details:', error);
            throw error;
        }
    }

    async checkCommentTone(code: string): Promise<string> {
        try {
            // Extract all comments from code
            const commentRegex = /\/\*[\s\S]*?\*\/|\/\/.*/g;
            const comments = code.match(commentRegex);
            
            if (!comments || comments.length === 0) {
                return "No comments found to analyze.";
            }

            const commentsText = comments.join(' ')
                .replace(/\/\//g, '')
                .replace(/\/\*|\*\//g, '')
                .trim();

            const response = await this.hf.textClassification({
                model: 'distilbert-base-uncased-finetuned-sst-2-english',
                inputs: commentsText
            });

            console.log('Sentiment Response:', response);

            // Interpret the sentiment
            const sentiment = response[0];
            let analysis = `Comment Tone Analysis:\n`;
            
            if (sentiment.label === 'POSITIVE' && sentiment.score > 0.8) {
                analysis += `✅ Comments are professional and positive (${Math.round(sentiment.score * 100)}% confidence)`;
            } else if (sentiment.label === 'NEGATIVE' && sentiment.score > 0.8) {
                analysis += `⚠️ Comments might be too negative or harsh (${Math.round(sentiment.score * 100)}% confidence)\n`;
                analysis += `Consider revising for a more constructive tone.`;
            } else {
                analysis += `📝 Comments are neutral in tone (${Math.round(sentiment.score * 100)}% confidence)`;
            }

            return analysis;
        } catch (error: any) {
            console.error('HuggingFace error details:', error);
            throw error;
        }
    }
}