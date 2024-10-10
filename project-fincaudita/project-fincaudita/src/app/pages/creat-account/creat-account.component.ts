import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-creat-account',
  standalone: true,
  imports: [HttpClientModule, FormsModule, CommonModule, NgbTypeaheadModule, RouterModule],
  templateUrl: './creat-account.component.html',
  styleUrls: ['./creat-account.component.css']
})
export class CreatAccountComponent implements OnInit {
  currentStep: number = 1;

  person: any = {
    first_name: '', 
    last_name: '', 
    type_document: '', 
    document: '', 
    phone: '', 
    email: '', 
    birth_of_date: '',
    cityId: 0,
    addres: ''
  };

  user: any = {
    username: '',
    password: '',
    roles: []
  };

  citys: any[] = [];
  showModal: boolean = true;  
  showModal1: boolean = true;  
  termsAccepted: boolean = false;

  private personApiUrl = 'http://localhost:9191/api/Person';
  private userApiUrl = 'http://localhost:9191/api/User';
  private citysUrl = 'http://localhost:9191/api/City';
  
  private personId: number | null = null;
  
  constructor(private http: HttpClient, private cdr: ChangeDetectorRef, private router: Router) {}

  searchCitys = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      map(term => term.length < 1 ? []
        : this.citys.filter(city => city.name.toLowerCase().includes(term.toLowerCase())).slice(0, 10))
    );

  formatCity = (city: any) => city.name;

  onCitySelect(event: any): void {
    const selectedCity = event.item;
    this.person.cityId = selectedCity.id;
  }

  ngOnInit(): void {
    this.getCitys();
    const storedPerson = sessionStorage.getItem('person');
    const storedTermsAccepted = sessionStorage.getItem('termsAccepted');

    if (storedPerson) {
      this.person = JSON.parse(storedPerson);
    }
    if (storedTermsAccepted) {
      this.termsAccepted = JSON.parse(storedTermsAccepted);
    }
  }



  getCitys(): void {
    this.http.get<any[]>(this.citysUrl).subscribe(
      (citys) => {
        this.citys = citys;
      },
      (error) => {
        console.error('Error fetching cities:', error);
      }
    );
  }

  getCityName(cityId: number): string {
    const city = this.citys.find(c => c.id === cityId);
    return city ? city.name : 'Unknown';

    
  }

  nextStep(): void {
    // Guardar el estado actual del formulario en sessionStorage antes de avanzar
    sessionStorage.setItem('person', JSON.stringify(this.person));
    sessionStorage.setItem('termsAccepted', JSON.stringify(this.termsAccepted));

    if (this.currentStep === 1 && this.validateStep1()) {
      this.currentStep++;
    } else if (this.currentStep === 2 && this.validateStep2()) {
      this.currentStep++;
    } else if (this.currentStep === 3) {
      this.onSubmit();
    }
  }

  onTermsNavigation() {
    // Guardar el estado actual del formulario en sessionStorage
    this.saveDataToSession();

    // Navegar a la página de términos y condiciones
    this.router.navigate(['/terms-conditions']);
  }

  private saveDataToSession(): void {
    sessionStorage.setItem('person', JSON.stringify(this.person));
    sessionStorage.setItem('termsAccepted', JSON.stringify(this.termsAccepted));
  }

  private loadStoredData(): void {
    const storedPerson = sessionStorage.getItem('person');
    const storedTermsAccepted = sessionStorage.getItem('termsAccepted');

    if (storedPerson) {
      this.person = JSON.parse(storedPerson);
    }
    if (storedTermsAccepted) {
      this.termsAccepted = JSON.parse(storedTermsAccepted);
    }
  }

  togglePasswordVisibility() {
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    const icon = document.getElementById('togglePassword');
    
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      icon?.classList.remove('fa-eye');
      icon?.classList.add('fa-eye-slash');
    } else {
      passwordInput.type = 'password';
      icon?.classList.remove('fa-eye-slash');
      icon?.classList.add('fa-eye');
    }
  }
  

  validateStep1(): boolean {
    // Validar que todos los campos obligatorios del primer paso estén completos
    if (!this.person.first_name || !this.person.last_name || !this.person.type_document || 
        !this.person.document || !this.person.phone || !this.person.birth_of_date) {
      Swal.fire({
        title: '¡Error!',
        text: 'Todos los campos del primer paso son obligatorios.',
        icon: 'error',
        confirmButtonText: 'Aceptar',
        background: '#ffffff', // Fondo blanco
        color: '#721c24', // Color del texto
        padding: '20px', // Espaciado interno
        showClass: {
          popup: 'animate__animated animate__fadeInDown' // Animación al aparecer
        },
        hideClass: {
          popup: 'animate__animated animate__fadeOutUp' // Animación al desaparecer
        },
        customClass: {
          title: 'swal-title',
          popup: 'swal-popup'
        }
      });
      return false;
    }
  
    // Validar si aceptó los términos y condiciones
    if (!this.termsAccepted) {
      Swal.fire({
        title: 'Debe aceptar los términos y condiciones',
        text: 'Por favor, acepte los términos y condiciones antes de continuar.',
        icon: 'error',
        confirmButtonText: 'Entendido',
        background: '#ffffff', // Fondo blanco
        color: '#721c24', // Color del texto
        padding: '20px', // Espaciado interno
        showClass: {
          popup: 'animate__animated animate__fadeInDown' // Animación al aparecer
        },
        hideClass: {
          popup: 'animate__animated animate__fadeOutUp' // Animación al desaparecer
        },
        customClass: {
          title: 'swal-title',
          popup: 'swal-popup'
        }
      });
      return false;
    }
  
    return true;
  }
  
  
  validateStep2(): boolean {
    if (!this.person.cityId || !this.person.addres || !this.person.email || !this.validateEmail(this.person.email)) {
      Swal.fire({
        title: '¡Error!',
        text: 'Todos los campos del segundo paso son obligatorios y el correo debe ser válido.',
        icon: 'error',
        confirmButtonText: 'Aceptar',
        background: '#ffffff', // Fondo blanco
        color: '#721c24', // Color del texto
        padding: '20px', // Espaciado interno
        showClass: {
          popup: 'animate__animated animate__fadeInDown' // Animación al aparecer
        },
        hideClass: {
          popup: 'animate__animated animate__fadeOutUp' // Animación al desaparecer
        },
        customClass: {
          title: 'swal-title',
          popup: 'swal-popup'
        }
      });
      return false;
    }
    return true;
  }
  
  validateLetters(input: string): boolean {
    const lettersPattern = /^[A-Za-zÀ-ÿ\s]+$/; // Permite solo letras y espacios
    return lettersPattern.test(input);
  }

  // Método para filtrar la entrada
  filterInput(event: any): void {
    const inputValue = event.target.value;
    // Reemplaza cualquier carácter que no sea letra o espacio
    const filteredValue = inputValue.replace(/[^A-Za-zÀ-ÿ\s]/g, '');
    // Actualiza el valor de person.first_name o person.last_name
    event.target.value = filteredValue;
    if (event.target.name === 'first_name') {
      this.person.first_name = filteredValue;
    } else if (event.target.name === 'last_name') {
      this.person.last_name = filteredValue;
    }
  }

  isValidAddress: boolean = false;

  // Método para validar el formato de la dirección
  validateAddress(address: string) {
    const addressPattern = /^(Calle|Carrera|Transversal)\s\d{1,3}\s?(\#\d{1,3}-\d{1,3})?$/i;
    this.isValidAddress = addressPattern.test(address);
  }

  validateNumber(event: KeyboardEvent) {
    const allowedKeys = ['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete', 'Enter'];
    if (allowedKeys.indexOf(event.key) !== -1) {
      return; // Permitir teclas especiales
    }
    if (event.key.length === 1 && !/^\d$/.test(event.key)) {
      event.preventDefault(); // Evitar que se ingresen letras
    }
  }
  
  emailError: string = '';

  validateEmail(email: string): { valid: boolean; message?: string } {
    if (!email) {
      return { valid: false, message: 'El correo es obligatorio.' };
    }
    if (!email.includes('@')) {
      return { valid: false, message: 'El símbolo "@" es obligatorio.' };
    }
    if (!email.endsWith('.com')) {
      return { valid: false, message: 'El dominio debe terminar con ".com".' };
    }
    const re = /^[a-zA-Z0-9._%+-]+@(gmail\.com|hotmail\.com)$/;
    if (!re.test(String(email).toLowerCase())) {
      return { valid: false, message: 'El correo debe ser de Gmail o Hotmail y no debe contener caracteres especiales.' };
    }
    return { valid: true };
  }
  
  onEmailChange() {
    const validation = this.validateEmail(this.person.email);
    if (!validation.valid) {
      this.emailError = validation.message || '';
    } else {
      this.emailError = ''; // Limpiar mensaje de error si es válido
    }
  }
  

usernameError: string = '';

isValidUsername(username: string): boolean {
  // Check if username is required and has the right length
  if (!username || username.length < 4 || username.length > 15) {
    this.usernameError = 'El nombre de usuario debe tener entre 4 y 15 caracteres.';
    return false;
  }

  // Check for at least one uppercase letter, one lowercase letter, and no special characters
  const hasUpperCase = /[A-Z]/.test(username);
  const hasLowerCase = /[a-z]/.test(username);
  const hasInvalidCharacters = /[^a-zA-Z]/.test(username);

  if (!hasUpperCase || !hasLowerCase || hasInvalidCharacters) {
    this.usernameError = 'El nombre de usuario debe contener al menos una mayúscula, una minúscula y no debe contener números ni caracteres especiales.';
    return false;
  }

  // Clear the error message if valid
  this.usernameError = '';
  return true;
}

passwordError: string = '';

isValidPassword(password: string): boolean {
  // Check if password meets the length requirement
  if (!password || password.length < 8) {
    this.passwordError = 'La contraseña debe tener al menos 8 caracteres.';
    return false;
  }

  // Check for at least one uppercase letter
  const hasUpperCase = /[A-Z]/.test(password);
  // Check for at least one number
  const hasNumber = /[0-9]/.test(password);
  
  if (!hasUpperCase) {
    this.passwordError = 'La contraseña debe contener al menos una mayúscula.';
    return false;
  }

  if (!hasNumber) {
    this.passwordError = 'La contraseña debe contener al menos un número.';
    return false;
  }

  // Clear the error message if valid
  this.passwordError = '';
  return true;
}



  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  confirmExit(): void {
    Swal.fire({
      title: '<strong>¿Estás seguro?</strong>',
      html: `
        <p>Si sales, perderás todos los datos ingresados.</p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: '<i class="fa fa-check-circle"></i> Sí, salir',
      cancelButtonText: '<i class="fa fa-times-circle"></i> Cancelar',
      reverseButtons: true,
      confirmButtonColor: '#44E32A', // Color del botón de confirmación (verde)
      cancelButtonColor: '#ff0000', // Color del botón de cancelación (verde)
      timer: 10000, 
      timerProgressBar: true, 
      showClass: {
        popup: 'animate__animated animate__fadeInDown'
      },
      hideClass: {
        popup: 'animate__animated animate__fadeOutUp'
      },
      customClass: {
        confirmButton: 'custom-confirm-btn',
        cancelButton: 'custom-cancel-btn',
        popup: 'custom-popup',
        title: 'custom-title',
        htmlContainer: 'custom-html'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.router.navigate(['/login']);
      }
    });
  }

  onSubmit(): void {
    if (!this.person.cityId) {
      Swal.fire('Error', 'Debe seleccionar una ciudad válida.', 'error');
      return;
    }
  
    this.person.birth_of_date = new Date(this.person.birth_of_date).toISOString();
    this.person.document = this.person.document.toString();
  
    this.http.post<any>(this.personApiUrl, this.person).subscribe({
      next: (response) => {
        this.personId = response.id;
        console.log('Datos de la persona enviados con éxito, ID:', this.personId);
        
        // Aquí se limpia el sessionStorage después de enviar los datos
        sessionStorage.clear(); // Limpia todos los datos de sessionStorage
  
        this.submitUserData();
      },
      error: () => {
        Swal.fire('Error', 'Hubo un problema al enviar los datos de la persona', 'error');
      }
    });
  }
  

  private submitUserData(): void {
    if (this.personId === null) {
      Swal.fire('Error', 'No se pudo obtener el ID de la persona.', 'error');
      return;
    }

    const userData = {
      username: this.user.username,
      password: this.user.password,
      roles: [{ id: 1 }],
      personId: this.personId
    };

    this.http.post(this.userApiUrl, userData).subscribe({
      next: () => {
        Swal.fire('Éxito', 'Cuenta creada con éxito', 'success');
        this.router.navigate(['/login']);
      },
      error: () => {
        Swal.fire('Error', 'Hubo un problema al enviar los datos del usuario', 'error');
      }
    });
  }
}
