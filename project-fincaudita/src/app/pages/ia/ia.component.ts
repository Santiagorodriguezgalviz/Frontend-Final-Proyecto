import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, inject, ViewChild, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OpenaiService } from './gemini.service';
import { log } from 'console';
import { interval, pipe, takeWhile } from 'rxjs';

type TypeChat =  'OPEN_AI' | 'USER';

type Chats ={
  type: TypeChat,
  message: string
}
@Component({
  selector: 'app-ia',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './ia.component.html',
  styleUrl: './ia.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IAComponent {
  chats:Chats[] = []
  private readonly geminiService = inject(OpenaiService)
  private readonly cdr = inject(ChangeDetectorRef)

  @ViewChild('txtInput') txtInput!: ElementRef<HTMLInputElement>;
  @ViewChild('ContentChat') ContentChat!: ElementRef<HTMLInputElement>;

   private setChat(type: TypeChat, message: string){
    this.chats.push({
      type,
      message
    })
  }
   public sendMessage(text: string){
    if(text.length > 3){
    this.setChat('USER', text);
    this.txtInput.nativeElement.value =''
    this.getResponseOpenAi(text)
    }
    }
   private scrollToBotton(): void {
    try{
    
    this.ContentChat.nativeElement.scrollTop = this.ContentChat.nativeElement.scrollHeight;
  }catch (err) {
    console.error('')
  }
   }

   private convertToHtml(responseGpt: string) {
    return responseGpt
      .replace(/###/g, '<br/>')
      .replace(/\n/g, '<br/>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
  }

  private typeText (responseGpt: string) {
    const responseHtml = this.convertToHtml(responseGpt)
    const responseLength = responseHtml.length
    let currentIndex = 0

    interval(10)
    .pipe(takeWhile(() => currentIndex < responseLength))
    .subscribe(()=> {

      const currentHtml = responseHtml[currentIndex]

      if (currentIndex === 0) this.setChat('OPEN_AI', currentHtml)
        else{
      const lastChat = this.chats[this.chats.length -1]

      lastChat.message += currentHtml
      }

    currentIndex++
    this.scrollToBotton()
    this.cdr.detectChanges()
    })
  }
  getResponseOpenAi(text:string){
    this.geminiService.send(text).subscribe(resp =>{
      const message = resp.choices[0].message.content
      this.typeText(message)

      this.geminiService.message.push({
        role: "assistant",
        content: message
      })
    })
  }
  
}
