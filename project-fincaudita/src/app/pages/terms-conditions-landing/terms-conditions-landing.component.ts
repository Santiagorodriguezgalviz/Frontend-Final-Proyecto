import { Component } from '@angular/core';
import { RouterLinkActive } from '@angular/router';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-terms-conditions-landing',
  standalone: true,
  imports: [RouterLinkActive],
  templateUrl: './terms-conditions-landing.component.html',
  styleUrl: './terms-conditions-landing.component.css'
})
export class TermsConditionsLandingComponent {
  constructor(private router: Router) {}

  acceptTerms1() {
    // Redirigir directamente a la página de destino
    this.router.navigate(['/landig-page']);
  }
}  