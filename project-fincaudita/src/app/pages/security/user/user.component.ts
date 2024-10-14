import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { NgSelectModule } from '@ng-select/ng-select';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MultiSelectModule } from 'primeng/multiselect';

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [
    HttpClientModule,
    FormsModule,
    CommonModule,
    NgbTypeaheadModule,
    NgSelectModule,
    MultiSelectModule,
    MatInputModule,
    MatAutocompleteModule
  ],
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.css']
})
export class UserComponent implements OnInit {
  users: any[] = [];
  user: any = { id: 0, username: '', password: '', personId: 0, state: true };
  persons: any[] = [];
  roles: any[] = [];
  isModalOpen = false;
  filteredUsers: any[] = [];
  filteredPersons: any[] = [];
  currentPage = 1;
  itemsPerPage = 5;
  searchTerm = '';
  itemsPerPageOptions = [5, 10, 20, 50];
  isDropdownOpen = false;

  private apiUrl = 'http://localhost:9191/api/User';
  private personsUrl = 'http://localhost:9191/api/Person';
  private rolesUrl = 'http://localhost:9191/api/Role';

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  usernameStrength: number = 0; // Valor entre 0 y 1
  usernameStrengthMessage: string = '';

  updateUsernameStrength(usernameField: any): void {
    const username = usernameField.value;

    // Resetear fuerza y mensaje
    this.usernameStrength = 0;
    this.usernameStrengthMessage = '';

    // Evaluar fuerza del nombre de usuario
    const lengthCriteria = username.length >= 4 && username.length <= 15; // Mínimo 4 y máximo 15 caracteres
    const uppercaseCriteria = /[A-Z]/.test(username); // Al menos una mayúscula
    const lowercaseCriteria = /[a-z]/.test(username); // Al menos una minúscula

    const criteriaMet = [lengthCriteria, uppercaseCriteria, lowercaseCriteria].filter(Boolean).length;

    // Calcular fuerza
    this.usernameStrength = criteriaMet / 3; // Normalizado entre 0 y 1

  }
  passwordStrength: number = 0;
passwordStrengthMessage: string | null = null;

updatePasswordStrength(passwordField: any): void {
  if (passwordField.value) {
    const lengthCriteria = passwordField.value.length >= 8 ? 1 : 0;
    const uppercaseCriteria = /[A-Z]/.test(passwordField.value) ? 1 : 0;
    const numberCriteria = /\d/.test(passwordField.value) ? 1 : 0;
    
    this.passwordStrength = lengthCriteria + uppercaseCriteria + numberCriteria;

  }
}

  onInputChange(field: any) {
    field.control.updateValueAndValidity();
  }

  ngOnInit(): void {
    this.getUsers();
    this.getPersons();
    this.getRoles();
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
  
  getPersonName(personId: number): string | undefined {
    const person = this.persons.find(p => p.id === personId);
    return person ? person.first_name : undefined;
  }

  validateUsername(username: string): boolean {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])[a-zA-Z]{4,15}$/;
    return regex.test(username);
  }

  // Función de validación de la contraseña
  validatePassword(password: string): boolean {
    const regex = /^(?=.*[A-Z])(?=.*[0-9]).{8,}$/;
    return regex.test(password);
  }
  

    filterUsers(): void {
      const search = this.searchTerm.toLowerCase().trim();
      this.filteredUsers = this.users.filter(user =>
        user.username.toLowerCase().includes(search) ||
        user.password.toLowerCase().includes(search) ||
        user.personId.toString().includes(search) || // Asegúrate de que esto sea correcto
        (user.state ? 'activo' : 'inactivo').includes(search) ||
        this.getPersonName(user.personId)?.toLowerCase().includes(search) // Filtrar por nombre de persona
      );
      this.currentPage = 1; // Resetear a la primera página
    }
  

  paginatedUser(): any[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredUsers.slice(start, end);
  }

  exportToExcel(): void {
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.filteredUsers);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Usuarios');
    XLSX.writeFile(workbook, 'listado de usuarios.xlsx');
  }

  exportToPDF(): void {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [['ID', 'Nombre de Usuario', 'ID de Persona', 'Estado']],
      body: this.filteredUsers.map(user => [
        user.personId,
        user.username,
        user.personId,
        user.state ? 'Activo' : 'Inactivo'
      ]),
    });
    doc.save('listado_de_usuarios.pdf');
  }

  onSearchChange(): void {
    this.filterUsers();
  }

  handleExport(event: any): void {
    const value = event;
  
    if (value === 'pdf') {
      this.exportToPDF();
    } else if (value === 'excel') {
      this.exportToExcel();
    }
  
    // Resetear el select después de la exportación
    this.searchTerm = ''; // Esto restablece el valor
  }
  

  updatePagination(): void {
    this.currentPage = 1;
    this.filterUsers();
  }

  onItemsPerPageChange(): void {
    this.updatePagination();
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  get totalPages(): number {
    return Math.ceil(this.filteredUsers.length / this.itemsPerPage);
  }

  getPageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  goToPage(page: number): void {
    this.currentPage = page;
  }

  hasSelected(): boolean {
    return this.users.some(user => user.selected);
  }
  selectAll(event: any): void {
    const checked = event.target.checked;
    this.users.forEach(user => (user.selected = checked));
  }

  // Verificar si todos los roles están seleccionados
  areAllSelected(): boolean {
    return this.users.length > 0 && this.users.every(role => role.selected);
  }


  deleteSelected(): void {
    const selectedIds = this.users.filter(user => user.selected).map(user => user.personId);

    if (selectedIds.length > 0) {
      Swal.fire({
        title: '¿Estás seguro?',
        text: '¡No podrás revertir esto!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminarlo',
        cancelButtonText: 'No, cancelar',
        reverseButtons: true
      }).then((result) => {
        if (result.isConfirmed) {
          const deleteRequests = selectedIds.map(id => this.http.delete(`${this.apiUrl}/${id}`).toPromise());
          Promise.all(deleteRequests)
            .then(() => {
              this.users = this.users.filter(user => !selectedIds.includes(user.personId));
              this.filterUsers();
              Swal.fire('¡Eliminados!', 'Los usuarios seleccionados han sido eliminados.', 'success');
            })
            .catch((error) => {
              console.error('Error eliminando usuarios seleccionados:', error);
              Swal.fire('Error', 'Hubo un problema al eliminar los usuarios seleccionados.', 'error');
            });
        }
      });
    } else {
      Swal.fire('Error', 'No hay usuarios seleccionados para eliminar.', 'error');
    }
  }

    searchpersons(event: any): void {
      const term = event.target.value.toLowerCase();
      this.filteredPersons = this.persons.filter(person => 
        person.first_name.toLowerCase().includes(term)
      );
    }
  
    onpersonSelect(event: any): void {
      const selectedperson = this.persons.find(person => 
        person.first_name === event.option.value
      );
      if (selectedperson) {
          this.user.personId = selectedperson.id;
          this.user.personFirst_name = selectedperson.first_name; // Agregar esto
          // Cierra el autocompletar
          this.filteredPersons = [];
      }
  }

  getUsers(): void {
    this.http.get<any[]>(this.apiUrl).subscribe(
      (users) => {
        this.users = users;
        this.processUsers();
        this.filterUsers();
        this.cdr.detectChanges();
      },
      (error) => {
        console.error('Error fetching users:', error);
      }
    );
  }

  getRoles(): void {
    this.http.get<any[]>(this.rolesUrl).subscribe(
      (roles) => {
        this.roles = roles;
        console.log('Roles loaded:', this.roles);
      },
      (error) => {
        console.error('Error fetching roles:', error);
      }
    );
  }

  processUsers(): void {
    this.users.forEach(user => {
      user.roleString = user.roles.map((role: any) => role.textoMostrar).join(', ');
    });
  }

  getPersons(): void {
    this.http.get<any[]>(this.personsUrl).subscribe(
      (persons) => {
        this.persons = persons;
      },
      (error) => {
        console.error('Error fetching persons:', error);
      }
    );
  }

  openModal(): void {
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.resetForm();
    this.filteredPersons = [];
  }

  onSubmit(form: NgForm): void {
    if (!this.user.personId) {
      Swal.fire('Error', 'Debe seleccionar una persona válida.', 'error');
      return;
    }

    if (!this.user.roles || this.user.roles.length === 0) {
      Swal.fire('Error', 'Debe seleccionar al menos un rol.', 'error');
      return;
    }

    const userToSave = {
      ...this.user,
      roles: this.user.roles.map((role: any) => ({
        id: role.id,
        textoMostrar: role.textoMostrar
      }))
    };

    if (this.user.id === 0) {
      this.http.post(this.apiUrl, userToSave).subscribe(() => {
        this.getUsers();
        this.closeModal();
        Swal.fire('Éxito', 'Usuario creado exitosamente!', 'success');
      });
    } else {
      this.http.put(this.apiUrl, userToSave).subscribe(() => {
        this.getUsers();
        this.closeModal();
        Swal.fire('Éxito', 'Usuario actualizado exitosamente!', 'success');
      });
    }
  }

  editUsers(user: any): void {
    this.user = { ...user, roles: user.roles.map((role: any) => ({ id: role.id, textoMostrar: role.textoMostrar })) };
    const selectedperson = this.persons.find(per => per.id === this.user.personId);
    if (selectedperson) {
        this.user.personFirst_name = selectedperson.first_name; // Necesitas agregar esta propiedad a tu objeto city
    }
    const selectedRoleIds = this.user.roles.map((role: any) => role.id);
    this.user.roles = this.roles.filter((role: any) => selectedRoleIds.includes(role.id));

    this.openModal();
  }

  deleteUsers(id: number): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: '¡No podrás revertir esto!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, elimínalo!',
      cancelButtonText: 'No, cancelar!',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.http.delete(`${this.apiUrl}/${id}`).subscribe(() => {
          this.getUsers();
          Swal.fire('¡Eliminado!', 'Tu archivo ha sido eliminado.', 'success');
        });
      }
    });
  }
  

  resetForm(): void {
    this.user = { id: 0, username: '', password: '', personId: 0, state: true, roles: [] };
    this.filteredPersons = [];
  }
}