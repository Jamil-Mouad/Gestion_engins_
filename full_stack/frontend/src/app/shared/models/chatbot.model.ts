export type ChunkType = 'text' | 'source' | 'done' | 'error';

export interface ChatbotChunk {
  type: ChunkType;
  content?: string;
  source?: {
    title: string;
    url: string;
  };
}

export interface Conversation {
  id: number;
  titre: string;
  favori: boolean;
  updatedAt: string;
  lastMessage?: string;
}

export interface ChatbotMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatbotChunk['source'][];
  timestamp: string;
  streaming?: boolean;
}