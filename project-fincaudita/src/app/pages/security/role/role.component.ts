import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NgSelectModule } from '@ng-select/ng-select';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { MultiSelectModule } from 'primeng/multiselect';

interface Role {
  id: number;
  name: string;
  description: string;
  views: any[]; // Ajusta el tipo según la estructura de tus vistas
  viewString?: string;
  state: boolean;
  selected: boolean;
}

interface View {
  id: number;
  name: string;
  textoMostrar?: string;
}

@Component({
  selector: 'app-role',
  standalone: true,
  imports: [HttpClientModule, CommonModule, FormsModule, NgSelectModule, FontAwesomeModule, MultiSelectModule,],
  templateUrl: './role.component.html',
  styleUrls: ['./role.component.css']
})
export class RoleComponent implements OnInit {
  roles: Role[] = [];
  role: Role = { id: 0, name: '', description: '', views: [], state: true, selected: false };
  views: View[] = [];
  isModalOpen = false;
  filteredRoles: Role[] = [];
  currentPage = 1;
  itemsPerPage = 5;
  searchTerm = '';
  itemsPerPageOptions = [5, 10, 20, 50];
  isDropdownOpen = false;

  private apiUrl = 'http://localhost:9191/api/Role';
  private apiUrlViews = 'http://localhost:9191/api/View';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    
  ) {
  }
  onInputChange(field: any) {
    field.control.updateValueAndValidity();
  }
  
  ngOnInit(): void {
    this.getRoles();
    this.getViews();
  }

  // Obtener la lista de roles desde la API
  getRoles(): void {
    this.http.get<Role[]>(this.apiUrl).subscribe(
      (roles) => {
        this.roles = roles.map(role => ({ ...role, selected: false }));
        this.processRoles();
        this.filterRoles();
        this.cdr.detectChanges();
      },
      (error) => {
        console.error('Error al obtener roles:', error);
      }
    );
  }

  // Obtener la lista de vistas desde la API
  getViews(): void {
    this.http.get<View[]>(this.apiUrlViews).subscribe(
      (views) => {
        this.views = views;
      },
      (error) => {
        console.error('Error al obtener vistas:', error);
      }
    );
  }

// Procesar roles para concatenar las vistas en una cadena
processRoles(): void {
  this.roles.forEach(role => {
    role.viewString = (role.views || []).map(view => view.textoMostrar || view.name).join(', ');
  });
}

  // Filtrar roles según el término de búsqueda
// Filtrar roles según el término de búsqueda
filterRoles(): void {
  const search = this.searchTerm.toLowerCase().trim();
  this.filteredRoles = this.roles.filter(role =>
    role.name.toLowerCase().includes(search) ||
    role.description.toLowerCase().includes(search) ||
    role.views.some(view => view.name?.toLowerCase().includes(search) || view.textoMostrar?.toLowerCase().includes(search)) ||
    (role.state ? 'activo' : 'inactivo').includes(search)
  );
  this.currentPage = 1; // Resetear a la primera página
}

  // Obtener los roles para la página actual
  paginatedRoles(): Role[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredRoles.slice(start, end);
  }

  // Manejar el cambio en el número de ítems por página
  updatePagination(): void {
    this.currentPage = 1;
    this.filterRoles();
  }

  // Abrir el modal para agregar o editar un rol
  openModal(): void {
    this.isModalOpen = true;
  }

  // Cerrar el modal y reiniciar el formulario
  closeModal(): void {
    this.isModalOpen = false;
    this.resetForm();
  }

  // Reiniciar el formulario
  resetForm(): void {
    this.role = { id: 0, name: '', description: '', views: [], state: false, selected: false };
  }

  // Manejar el envío del formulario para agregar o editar un rol
  onSubmit(form: NgForm): void {
    if (this.role.name.trim() === '' || this.role.description.trim() === '') {
      Swal.fire('Error', 'Por favor, complete todos los campos requeridos.', 'error');
      return;
    }

    if (!this.role.views || this.role.views.length === 0) {
      Swal.fire('Error', 'Debe seleccionar vistas válidas.', 'error');
      return;
    }

    const roleToSave = {
      ...this.role,
      views: this.role.views.map(view => ({
        id: view.id,
        name: view.name
      }))
    };

    if (this.role.id === 0) {
      // Crear nuevo rol
      this.http.post<Role>(this.apiUrl, roleToSave).subscribe(
        (newRole) => {
          this.roles.push({ ...newRole, selected: false });
          this.processRoles();
          this.filterRoles();
          this.closeModal();
          Swal.fire('Éxito', '¡Rol creado exitosamente!', 'success');
        },
        (error) => {
          console.error('Error al crear rol:', error);
          Swal.fire('Error', 'Hubo un problema al crear el rol.', 'error');
        }
      );
    } else {
      // Actualizar rol existente
      this.http.put(this.apiUrl, roleToSave).subscribe(
        () => {
          const index = this.roles.findIndex(r => r.id === this.role.id);
          if (index !== -1) {
            this.roles[index] = { ...this.role, selected: false };
            this.processRoles();
            this.filterRoles();
          }
          this.closeModal();
          Swal.fire('Éxito', '¡Rol actualizado correctamente!', 'success');
        },
        (error) => {
          console.error('Error al actualizar rol:', error);
          Swal.fire('Error', 'Hubo un problema al actualizar el rol.', 'error');
        }
      );
    }
  }

  // Editar un rol existente
  editRole(role: Role): void {
    this.role = { ...role };
    // Asegurar que las vistas seleccionadas estén correctamente mapeadas
    const selectedViewIds = this.role.views.map(view => view.id);
    this.role.views = this.views.filter(view => selectedViewIds.includes(view.id));
    this.openModal();
  }

  // Eliminar un rol individual
  deleteRole(id: number): void {
    Swal.fire({
      title: '¿Está seguro?',
      text: '¡No podrá revertir esto!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: '¡Sí, elimínelo!',
      cancelButtonText: '¡No, cancele!',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.http.delete(`${this.apiUrl}/${id}`).subscribe(
          () => {
            this.roles = this.roles.filter(role => role.id !== id);
            this.filterRoles();
            Swal.fire('Eliminado', 'Su rol ha sido eliminado.', 'success');
          },
          (error) => {
            console.error('Error al eliminar rol:', error);
            Swal.fire('Error', 'Hubo un problema al eliminar el rol.', 'error');
          }
        );
      }
    });
  }

  // Seleccionar o deseleccionar todos los roles
  selectAll(event: any): void {
    const checked = event.target.checked;
    this.roles.forEach(role => (role.selected = checked));
  }

  // Verificar si todos los roles están seleccionados
  areAllSelected(): boolean {
    return this.roles.length > 0 && this.roles.every(role => role.selected);
  }

  // Verificar si al menos un rol está seleccionado
  hasSelected(): boolean {
    return this.roles.some(role => role.selected);
  }

  // Eliminar los roles seleccionados
  deleteSelected(): void {
    const selectedIds = this.roles.filter(role => role.selected).map(role => role.id);

    if (selectedIds.length > 0) {
      Swal.fire({
        title: '¿Está seguro?',
        text: '¡No podrá revertir esto!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '¡Sí, elimínelos!',
        cancelButtonText: '¡No, cancele!',
        reverseButtons: true
      }).then((result) => {
        if (result.isConfirmed) {
          const deleteRequests = selectedIds.map(id => this.http.delete(`${this.apiUrl}/${id}`).toPromise());

          Promise.all(deleteRequests)
            .then(() => {
              this.roles = this.roles.filter(role => !selectedIds.includes(role.id));
              this.filterRoles();
              Swal.fire('¡Eliminados!', 'Los roles seleccionados han sido eliminados.', 'success');
            })
            .catch((error) => {
              console.error('Error al eliminar roles seleccionados:', error);
              Swal.fire('Error', 'Hubo un problema al eliminar los roles seleccionados.', 'error');
            });
        }
      });
    } else {
      Swal.fire('Error', 'No hay roles seleccionados para eliminar.', 'error');
    }
  }

  // Exportar la lista de roles a Excel
  exportToExcel(): void {
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.filteredRoles.map(role => ({
      ID: role.id,
      Nombre: role.name,
      Descripción: role.description,
      Vistas: role.viewString || 'Ninguna',
      Estado: role.state ? 'Activo' : 'Inactivo'
    })));
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Roles');
    XLSX.writeFile(workbook, 'listado de roles.xlsx');
  }

  // Exportar la lista de roles a PDF
  exportToPDF(): void {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [['ID', 'Nombre', 'Descripción', 'Vistas', 'Estado']],
      body: this.filteredRoles.map(role => [
        role.id,
        role.name,
        role.description,
        role.viewString || 'Ninguna',
        role.state ? 'Activo' : 'Inactivo'
      ]),
    });
    doc.save('listado de roles.pdf');
  }

  // Manejar la selección de exportación
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

  // Manejar el cambio en el término de búsqueda
  onSearchChange(): void {
    this.filterRoles();
  }

  // Manejar el cambio en el número de ítems por página
  onItemsPerPageChange(): void {
    this.updatePagination();
  }

  // Navegar a la página anterior
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  // Navegar a la página siguiente
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  // Calcular el número total de páginas
  get totalPages(): number {
    return Math.ceil(this.filteredRoles.length / this.itemsPerPage);
  }

  // Obtener los números de página para la navegación
  getPageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  // Navegar a una página específica
  goToPage(page: number): void {
    this.currentPage = page;
  }
}
