export interface ChatCompletion {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Choice[];
    usage: Usage;
    system_fingerprint: string;
  }
  
  interface Choice {
    index: number;
    message: Message;
    logprobs: null | any;  // Assuming logprobs can be null or any type
    finish_reason: string;
  }
  
  interface Message {
    role: string;
    content: string;
  }
  
  interface Usage {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  }
      