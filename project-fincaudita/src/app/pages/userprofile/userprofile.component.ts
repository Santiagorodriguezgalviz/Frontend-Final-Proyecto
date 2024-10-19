import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatExpansionModule } from '@angular/material/expansion';
import Swal from 'sweetalert2';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-userprofile',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule, CommonModule, HttpClientModule,MatExpansionModule, MatInputModule,
    MatAutocompleteModule],
  templateUrl: './userprofile.component.html',
  styleUrls: ['./userprofile.component.css']
})
export class UserprofileComponent implements OnInit {
  username: string = '';
  password: string = '';
  user: any = { id: 0, username: '', password: '',  personId: 0, state: true };
  filteredCitys: any[] = [];
  persons: any[] = [];
  person: any = {
    id: 0,
    first_name: '',
    last_name: '',
    email: '',
    type_document: '',
    document: '',
    addres: '',
    phone: '',
    birth_of_date: new Date().toISOString().slice(0, 10),
    cityId: 0,
  };
  citys: any[] = [];
  roles: any = [ { id: 0 } ]

  private apiUrl = 'http://localhost:9191/api/Person';
  private updatePasswordUrl = 'http://localhost:9191/api/user';
  private citysUrl = 'http://localhost:9191/api/City';

  profileImageUrl: string | ArrayBuffer | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.profileImageUrl = localStorage.getItem('profileImageUrl') || '../../assets/Avatar.png';
    this.loadUserData(); // Cargar los datos del usuario
    this.getCitys();
    this.getPersons();
  }


  getPersons(): void {
    const personId = localStorage.getItem('personId');
    if(personId){
    this.http.get<any[]>(this.apiUrl).subscribe(
      (persons) => { 
        this.persons = persons.map(person => ({
          ...person,
          birth_of_date: new Date(person.birth_of_date).toISOString().slice(0, 10),
          selected: false
        
      }));
      },
      (error) => {
        console.error('Error fetching persons:', error);
      }
    );
  }
  }

  getCitys(): void {
    this.http.get<any[]>(this.citysUrl).subscribe(
      (citys) => {
        this.citys = citys;
        this.filteredCitys;

      },
      (error) => {
        console.error('Error fetching cities:', error);
      }
    );
  }

  searchCitys(event: any): void {
    const term = event.target.value.toLowerCase();
    this.filteredCitys = this.citys.filter(city => 
      city.name.toLowerCase().includes(term)
    );
  }

  onCitySelect(event: any): void {
    const selectedcity = this.citys.find(city => 
      city.name === event.option.value
    );
    if (selectedcity) {
        this.user.cityId = selectedcity.id;
        this.user.cityName = selectedcity.name; // Agregar esto
        // Cierra el autocompletar
        this.filteredCitys = [];
    }
}

  async loadUserData() {
    await this.loadUser();
    console.log(this.user);
    this.username = this.user.username; 
    this.password = this.user.password;
  }

  

  triggerFileInput() {
    const fileInput = document.getElementById('fileInput') as HTMLElement;
    fileInput.click();
  }

  onFileSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.profileImageUrl = reader.result;
        localStorage.setItem('profileImageUrl', this.profileImageUrl as string);
      };
      reader.readAsDataURL(file);
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

  saveChanges() {
    const userData = JSON.parse(localStorage.getItem('menu') || '');
    const updatedData = {
        id: userData.menu[0].userID,
        username: this.username, 
        password: this.password,
        personId: this.user.personId,
        roles: this.roles
    };

    const apiUrl = 'http://localhost:9191/api/user/';
    this.http.put(apiUrl, updatedData).subscribe(
        (response: any) => {
            Swal.fire({
                title: 'Éxito',
                text: 'Usuario actualizado correctamente.',
                icon: 'success',
                timer: 3000,
                timerProgressBar: true,
                showConfirmButton: false
            });
        },
        (error: any) => {
            Swal.fire({
                title: 'Error',
                text: 'Error al actualizar el usuario: ' + error.message,
                icon: 'error',
                timer: 3000,
                timerProgressBar: true,
                showConfirmButton: false
            });
        }
    );
  }

  async loadUser(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const storedData = JSON.parse(localStorage.getItem('menu') || '');
      const userId = storedData.menu[0].userID;
  
      if (userId) {
        this.http.get(`${this.updatePasswordUrl}/${userId}`).subscribe(
          (response: any) => {
            this.user.id = response.id;
            this.user.username = response.username;
            this.user.personId = response.personId;
            this.user.password = response.password;
            this.roles = response.roles;
            resolve(); 
          },
          (error) => {
            console.error('Error al cargar el usuario:', error);
            Swal.fire('Error', 'No se pudo cargar el usuario. Por favor, intenta de nuevo.', 'error');
            reject(error); 
          }
        );
      } else {
        Swal.fire('Error', 'No se encontró el ID del usuario en la sesión.', 'error');
        reject('No se encontró el ID del usuario en la sesión.');
      }
    });
  }
}