import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors } from '@angular/forms';

@Injectable({
  providedIn: 'root'
})
export class ValidationService {

  // Validar que el nombre no tenga caracteres especiales y no sea mayor a 15 caracteres
  validateName(control: AbstractControl): ValidationErrors | null {
    const name = control.value;
    const regex = /^[a-zA-Z\s]*$/;  // Solo letras y espacios

    if (name.length > 15) {
      return { maxLength: true };
    }

    if (!regex.test(name)) {
      return { invalidCharacters: true };
    }

    return null; // Validación exitosa
  }

  // Validar que la descripción no sea mayor a 20 caracteres
  validateDescription(control: AbstractControl): ValidationErrors | null {
    const description = control.value;

    if (description.length > 20) {
      return { maxLength: true };
    }

    return null; // Validación exitosa
  }

  // Validar que la posición sea mayor a 3
  validatePosition(control: AbstractControl): ValidationErrors | null {
    const position = +control.value; // Convertir a número

    if (position <= 3) {
      return { minPosition: true };
    }

    return null; // Validación exitosa
  }
}
