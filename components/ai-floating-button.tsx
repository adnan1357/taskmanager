"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bot, X } from 'lucide-react';
import { AIChat } from '@/components/ai-chat';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIState } from '@/lib/hooks/use-ui-state';

export function AIFloatingButton() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { isAIChatVisible } = useUIState();

  const toggleChat = () => {
    setIsChatOpen(prev => !prev);
  };

  // If the chat isn't visible (because members sidebar is expanded), don't render anything
  if (!isAIChatVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.2 }}
            className="mb-4"
          >
            <Card className="w-[350px] h-[500px] shadow-lg overflow-hidden">
              <div className="bg-primary text-primary-foreground p-3 flex justify-between items-center">
                <h3 className="font-medium">AI Assistant</h3>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-8 w-8 p-0 text-primary-foreground hover:bg-primary/90"
                  onClick={toggleChat}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="h-[calc(100%-48px)]">
                <AIChat className="h-full" />
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isChatOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="flex items-center"
          >
            <div 
              className="bg-primary text-primary-foreground px-4 py-2 rounded-l-full shadow-lg cursor-pointer mr-[-8px] z-0"
              onClick={toggleChat}
            >
              <span className="text-sm font-medium whitespace-nowrap">Manage projects with AI</span>
            </div>
            
            <Button
              onClick={toggleChat}
              className="rounded-full w-14 h-14 shadow-lg bg-primary hover:bg-primary/90 z-10"
              aria-label="Open AI Assistant"
            >
              <Bot className="h-6 w-6" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 