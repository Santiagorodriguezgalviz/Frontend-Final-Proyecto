// modulo.interface.ts
export interface Modulo {
    id: number;
    name: string;
    description: string;
    position: number;
    state: boolean;
    selected?: boolean; // optional property for selection state
  }
  