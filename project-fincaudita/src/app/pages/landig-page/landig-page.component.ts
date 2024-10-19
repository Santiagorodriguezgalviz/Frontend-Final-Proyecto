import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ViewportScroller } from '@angular/common';
@Component({
  selector: 'app-landig-page',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './landig-page.component.html',
  styleUrls: ['./landig-page.component.css']
})
export class LandigPageComponent {

 currentSection: string = 'Inicio';

  constructor(private viewportScroller: ViewportScroller) {}

  isMenuActive: boolean = false;


  scrollToSection(section: string): void {
    this.viewportScroller.scrollToAnchor(section);
    this.currentSection = section;
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    const sections = ['Inicio', 'SobreNosotros', 'Servicios'];
    let currentSection = sections[0];

    for (const section of sections) {
      const element = document.getElementById(section);
      if (element && window.scrollY >= element.offsetTop - 50) {
        currentSection = section;
      }
    }

    this.currentSection = currentSection;
  }
}