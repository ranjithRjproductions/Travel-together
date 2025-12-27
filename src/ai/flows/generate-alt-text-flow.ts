'use server';
/**
 * @fileOverview An AI flow to generate alt text for user profile photos.
 *
 * - generateAltText - A function that analyzes a photo and returns alt text.
 * - GenerateAltTextInput - The input type for the flow.
 * - GenerateAltTextOutput - The return type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateAltTextInputSchema = z.object({
  userName: z.string().describe('The full name of the user in the photo.'),
  photoDataUri: z
    .string()
    .describe(
      "A photo of a user, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type GenerateAltTextInput = z.infer<typeof GenerateAltTextInputSchema>;

const GenerateAltTextOutputSchema = z.object({
  personCount: z.number().describe('The number of people detected in the image.'),
  altText: z
    .string()
    .describe(
      'A concise, descriptive alt text for the image, starting with "A photo of [userName]..."'
    ),
});
export type GenerateAltTextOutput = z.infer<typeof GenerateAltTextOutputSchema>;

export async function generateAltText(
  input: GenerateAltTextInput
): Promise<GenerateAltTextOutput> {
  return generateAltTextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateAltTextPrompt',
  input: { schema: GenerateAltTextInputSchema },
  output: { schema: GenerateAltTextOutputSchema },
  prompt: `You are an expert at analyzing images and writing accessible alt text.
Your task is to analyze the provided image of a user for their profile.

1.  Count the number of people in the image. Set this value to the personCount field.
2.  If there is exactly one person, write a brief, friendly, and descriptive alt text. The description should start with "A photo of {{{userName}}}" and then describe what they are doing or their appearance (e.g., smiling, standing in front of a landmark).
3.  If there is more than one person or no people, set the altText to a simple description of the image content.

User Name: {{{userName}}}
Photo: {{media url=photoDataUri}}`,
});

const generateAltTextFlow = ai.defineFlow(
  {
    name: 'generateAltTextFlow',
    inputSchema: GenerateAltTextInputSchema,
    outputSchema: GenerateAltTextOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
