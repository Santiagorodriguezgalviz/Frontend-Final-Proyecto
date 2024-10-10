import { Component, ElementRef, OnInit, ViewChildren, QueryList, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SvgsComponent } from "../svgs/svgs.component";
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../guard/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, SvgsComponent, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.css']
})
export class MenuComponent implements OnInit {
  @ViewChildren('collapse') collapses!: QueryList<ElementRef>;

  menu: any[] = [];
  private activeAccordion: string | undefined;
  profileImageUrl: string | null = null;
  authService = inject(AuthService);

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.loadMenu();
    this.loadProfileImage();

  }
  
  loadProfileImage() {
    this.profileImageUrl = localStorage.getItem('profileImageUrl');
  }

  loadMenu() {
    const storedMenu = localStorage.getItem("menu");
    if (storedMenu) {
      const parsedMenu = JSON.parse(storedMenu);
      this.menu = parsedMenu?.menu?.[0]?.listView || [];
    } else {
      this.menu = []; 
    }
  }

  logout() {
    Swal.fire({
      title: '¿Estás seguro?',
      text: '¡Seguro que quieres cerrar sesión!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí',
      cancelButtonText: 'No',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.showLoadingSpinner();
        
        // Simula el proceso de cierre de sesión con un temporizador
        setTimeout(() => {
          this.authService.logout(); // Cambia el estado de autenticación a false
          localStorage.removeItem("menu");
          Swal.close(); // Cierra el popup de carga
          this.router.navigate(['/landing-page']);
  
          // Mostrar mensaje personalizado después de cerrar sesión
          Swal.fire({
            title: '¡Cerraste sesión!',
            text: '¡Vuelve pronto!',
            icon: 'success',
            timer: 2000, // El mensaje se cerrará automáticamente después de 3 segundos
            showConfirmButton: false
          });
          
        }, 2000); // Ajusta el tiempo según sea necesario para la animación de carga
      }
    });
  }
  
  showLoadingSpinner() {
    Swal.fire({
      title: 'Cerrando sesión...',
      text: 'Por favor, espera un momento.',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  }
  toggleAccordion(module: string) {
    const collapseElement = this.collapses.find(collapse => collapse.nativeElement.id === module + 'Collapse');
    if (collapseElement) {
      const isCollapsed = collapseElement.nativeElement.classList.contains('show');
      
      if (this.activeAccordion && this.activeAccordion !== module) {
        const previousCollapse = this.collapses.find(collapse => collapse.nativeElement.id === this.activeAccordion + 'Collapse');
        if (previousCollapse) {
          previousCollapse.nativeElement.classList.remove('show');
        }
      }

      if (isCollapsed) {
        collapseElement.nativeElement.classList.remove('show');
        this.activeAccordion = undefined;
      } else {
        collapseElement.nativeElement.classList.add('show');
        this.activeAccordion = module;
      }
    }
  }

  isAccordionOpen(module: string): boolean {
    return this.activeAccordion === module;
  }
}
