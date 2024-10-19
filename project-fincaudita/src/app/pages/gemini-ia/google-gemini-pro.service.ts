import { Injectable } from '@angular/core';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable({
  providedIn: 'root'
})
export class GoogleGeminiProService {

  private genIA: any;
  private model: any;

  // Inicializa el servicio con la clave de API y un modelo opcional
  initialize(key: string, config?: any) {
    try {
      this.genIA = new GoogleGenerativeAI(key);
      const defaultModel = { model: 'gemini-pro' };
      this.model = this.genIA.getGenerativeModel(config || defaultModel);
    } catch (error) {
      console.error('Error al inicializar el modelo:', error);
    }
  }

  // Método para generar texto basado en un prompt
  async generateText(prompt: string): Promise<string> {
    if (!this.model) {
      throw new Error('El modelo no está inicializado');
    }

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error al generar texto:', error);
      throw new Error('No se pudo generar la respuesta. Intente nuevamente.');
    }
  }
}
