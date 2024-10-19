import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { key } from '../../../key';
import { GoogleGeminiProService } from './google-gemini-pro.service';

@Component({
  selector: 'app-gemini',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet],
  templateUrl: './gemini-ia.component.html',
  styleUrls: ['./gemini-ia.component.css'] // Asegúrate de que este sea el nombre correcto
})
export class GeminiIAComponent {
  title = 'ng-gemini-test';
  @ViewChild('scrollframe') scrollframe?: ElementRef;

  result = '';
  prompt = '';
  writing = false;

  questions: Array<{ prompt: string; result: string }> = [];

  constructor(private googleGeminiPro: GoogleGeminiProService) {
    this.googleGeminiPro.initialize(key);
  }

  async generate() {
    if (!this.prompt.trim()) return; // Evitar enviar si el campo está vacío
    this.writing = true; // Activar el estado de escritura
    const newQuestion = { prompt: this.prompt, result: '' }; // Crear una nueva pregunta
    this.questions.push(newQuestion); // Agregarla a la lista de preguntas
    const result = await this.googleGeminiPro.generateText(this.prompt);
    this.write(result, 0); // Llamar a la función de escritura para mostrar la respuesta
    this.prompt = ''; // Limpiar el campo de entrada aquí también
}


  write(result: string, index: number) {
    this.questions[this.questions.length - 1].result = result.slice(0, index);
    
    if (index < result.length) {
      setTimeout(() => {
        this.scroll();
        this.write(result, index + 1);
      }, this.randomVelocity());
    } else {
      this.writing = false; // Dejar de escribir cuando termine
    }
  }

  scroll() {
    const maxScroll = this.scrollframe?.nativeElement.scrollHeight;
    this.scrollframe?.nativeElement.scrollTo({ top: maxScroll, behavior: 'smooth' });
  }

  randomVelocity(): number {
    const velocity = Math.floor(Math.random() * 25 + 1);
    return velocity;
  }
}
