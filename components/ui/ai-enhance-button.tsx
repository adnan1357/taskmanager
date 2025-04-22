"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface AIEnhanceButtonProps {
  text: string;
  onEnhancedText: (text: string) => void;
  disabled?: boolean;
}

export function AIEnhanceButton({ text, onEnhancedText, disabled }: AIEnhanceButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const enhanceText = async () => {
    try {
      setIsLoading(true);
      
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      
      // Safe debug logging that doesn't expose the full key
      console.log('API Key Debug Info:', {
        hasKey: !!apiKey,
        keyLength: apiKey?.length || 0,
        startsWithAIza: apiKey?.startsWith('AIza'),
        firstFourChars: apiKey?.substring(0, 4),
        lastFourChars: apiKey?.slice(-4),
        // Show the key structure with asterisks
        maskedKey: apiKey ? `${apiKey.substring(0, 4)}${'*'.repeat(apiKey.length - 8)}${apiKey.slice(-4)}` : 'not-set'
      });

      if (!apiKey) {
        throw new Error('Gemini API key is not configured');
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: "Neaten and rewrite the following task description to be concise, clear, and professional. Keep the original meaning, but remove filler words or messy phrasing. Respond with only the improved text.\n",
      });

      const generationConfig = {
        temperature: 1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        responseMimeType: "text/plain",
      };

      const chatSession = model.startChat({
        generationConfig,
        history: [],
      });

      console.log('Sending message:', text);
      const result = await chatSession.sendMessage(text);
      console.log('Received result:', result);

      const response = result.response;
      console.log('Response:', response);

      if (!response.text) {
        throw new Error('No text in response');
      }

      const enhancedText = response.text();
      onEnhancedText(enhancedText);
      toast.success('Description enhanced successfully');
    } catch (error: any) {
      console.error('Error enhancing text:', error);
      toast.error(error.message || 'Failed to enhance description');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      disabled={disabled || isLoading || !text}
      onClick={enhanceText}
      className="h-8 w-8"
      title="Enhance description with AI"
    >
      <Wand2 className={cn("h-4 w-4", isLoading && "animate-spin")} />
    </Button>
  );
} 