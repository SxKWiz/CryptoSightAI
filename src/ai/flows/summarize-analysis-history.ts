'use server';
/**
 * @fileOverview Summarizes the user's past analysis history to help improve their trading strategy.
 *
 * - summarizeAnalysisHistory - A function that handles the summarization process.
 * - SummarizeAnalysisHistoryInput - The input type for the summarizeAnalysisHistory function.
 * - SummarizeAnalysisHistoryOutput - The return type for the summarizeAnalysisHistory function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeAnalysisHistoryInputSchema = z.object({
  analysisHistory: z.string().describe('The user\'s past analysis history data.'),
});
export type SummarizeAnalysisHistoryInput = z.infer<typeof SummarizeAnalysisHistoryInputSchema>;

const SummarizeAnalysisHistoryOutputSchema = z.object({
  summary: z.string().describe('A summary of the user\'s past analysis history.'),
  keyInsights: z.string().describe('Key insights and recommendations based on the analysis history.'),
});
export type SummarizeAnalysisHistoryOutput = z.infer<typeof SummarizeAnalysisHistoryOutputSchema>;

export async function summarizeAnalysisHistory(input: SummarizeAnalysisHistoryInput): Promise<SummarizeAnalysisHistoryOutput> {
  return summarizeAnalysisHistoryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeAnalysisHistoryPrompt',
  input: {schema: SummarizeAnalysisHistoryInputSchema},
  output: {schema: SummarizeAnalysisHistoryOutputSchema},
  prompt: `You are an AI trading strategy analyst. Your task is to analyze a user's past trading analysis history and provide a summary and key insights to help them improve their strategy.

Analysis History:
{{{analysisHistory}}}

Provide a concise summary of the analysis history and identify key insights and recommendations based on the data. Focus on patterns, strengths, and weaknesses in their analysis and trading decisions.`,}
);

const summarizeAnalysisHistoryFlow = ai.defineFlow(
  {
    name: 'summarizeAnalysisHistoryFlow',
    inputSchema: SummarizeAnalysisHistoryInputSchema,
    outputSchema: SummarizeAnalysisHistoryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
