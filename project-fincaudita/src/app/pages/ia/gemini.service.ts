import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ChatCompletion } from './gemini-interface';

@Injectable({
  providedIn: 'root'
})
export class OpenaiService {
  private readonly URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=YOUR_API_KEY';
  private readonly API_KEY = 'AIzaSyASlR7RGIHv3pRsct6uTAvjHy5NRRGabk8';

  constructor() {}

  message = [
    {
        role: "system",
        content: "Eres un asistente virtual. Responde de manera concisa y clara. Evita respuestas largas y repite lo mínimo necesario."
      },
  ]

  private http = inject(HttpClient)
  send(text:string){
    this.message.push({
        role: "user",
        content: text
    })
    
    const body = {
        model: "gpt-4o",
        messages: this.message,
        max_tokens: 300
    }

     return this.http.post<ChatCompletion>(this.URL, body,{
        headers:{
            'content-Type': 'application/json',
            'Authorization': `Bearer ${this.API_KEY}`
        }
    })

  }
}
