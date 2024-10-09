import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-terms-conditions',
  standalone: true,
  imports: [RouterLinkActive],
  templateUrl: './terms-conditions.component.html',
  styleUrls: ['./terms-conditions.component.css']
})
export class TermsConditionsComponent {
  constructor(private router: Router) {}

  acceptTerms(): void {
    // Guardar el estado de aceptación en sessionStorage
    sessionStorage.setItem('termsAccepted', JSON.stringify(true));

    // Mostrar la notificación de aceptación
    Swal.fire({
      title: '¡Términos Aceptados!',
      text: 'Gracias por aceptar los términos y condiciones.',
      icon: 'success',
      confirmButtonText: 'Continuar',
      confirmButtonColor: '#008f39',
      background: '#f4f6f9',
    }).then((result) => {
      if (result.isConfirmed) {
        this.router.navigate(['/creat-account']); // Asegúrate de que esta ruta sea correcta
      }
    });
  }
}
