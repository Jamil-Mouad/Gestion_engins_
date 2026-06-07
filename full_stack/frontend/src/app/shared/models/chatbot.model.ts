export type ChunkType = 'text' | 'source' | 'done';

export interface ChatbotChunk {
  type: ChunkType;
  content?: string;
  source?: {
    title: string;
    url: string;
  };
}

export interface ChatbotMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatbotChunk['source'][];
  timestamp: string;
  streaming?: boolean;
}