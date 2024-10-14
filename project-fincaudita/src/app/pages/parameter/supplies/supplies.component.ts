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
@Component({
  selector: 'app-supplies',
  standalone: true,
  imports: [HttpClientModule, FormsModule, CommonModule, NgbTypeaheadModule, NgSelectModule],
  templateUrl: './supplies.component.html',
  styleUrl: './supplies.component.css'
})
export class SuppliesComponent {
  supplies: any[] = [];
  supplie: any = { id: 0, name: '', description: '', code: '', price: '', state: false };
  isModalOpen = false;
  filteredSupplies: any[] = [];
  currentPage = 1;
  itemsPerPage = 5;
  searchTerm = '';
  itemsPerPageOptions = [5, 10, 20, 50];
  isDropdownOpen = false;

  private apiUrl = 'http://localhost:9191/api/Supplies';

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  onlyAlphanumeric(event: KeyboardEvent) {
    const regex = /^[a-zA-Z0-9]*$/; // Solo permite letras y números
    if (!regex.test(event.key)) {
      event.preventDefault(); // Previene la entrada si no es válida
    }
  }
  
  onlyPositiveNumbers(event: KeyboardEvent) {
    // Permitir solo números (0-9) y el punto (.) si es necesario
    const char = String.fromCharCode(event.keyCode);
    if (!/[0-9]/.test(char)) {
      event.preventDefault(); // Previene la entrada si no es válida
    }
  }

  ngOnInit(): void {
    this.getsupplies();
  }

  getsupplies(): void {
    this.http.get<any[]>(this.apiUrl).subscribe(
      (supplies) => {
        this.supplies = supplies;
        this.filterSupplies();
        this.cdr.detectChanges();
      },
      (error) => {
        console.error('Error al obtener los suministros:', error);
      }
    );
  }

  filterSupplies(): void {
    const search = this.searchTerm.toLowerCase().trim();
    this.filteredSupplies = this.supplies.filter(supplie =>
        supplie.name.toLowerCase().includes(search) ||              // Filtrar por nombre del suministro
        supplie.description.toLowerCase().includes(search) ||       // Filtrar por descripción del suministro
        supplie.price.toString().includes(search) ||                // Filtrar por precio del suministro
        supplie.code.toLowerCase().includes(search) ||              // Filtrar por código del suministro
        (supplie.state ? 'activo' : 'inactivo').includes(search)   // Filtrar por estado
    );
    this.currentPage = 1; // Resetear a la primera página
}

paginateSupplies(): any[] {
  const start = (this.currentPage - 1) * this.itemsPerPage;
  const end = start + this.itemsPerPage;
  return this.filteredSupplies.slice(start, end);
}

exportToExcel(): void {
  const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.filteredSupplies); // Cambiado de filteredUsers a filteredSupplies
  const workbook: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Suministros'); // Cambiado de 'Usuarios' a 'Suministros'
  XLSX.writeFile(workbook, 'Listado de Insumos.xlsx'); // Cambiado de 'listado de usuarios.xlsx' a 'listado_de_suministros.xlsx'
}

exportToPDF(): void {
  const doc = new jsPDF();
  autoTable(doc, {
      head: [['ID', 'Nombre', 'Descripción', 'Precio', 'Código', 'Estado']], // Encabezados adaptados
      body: this.filteredSupplies.map(supplie => [ // Cambiado de filteredUsers a filteredSupplies
          supplie.id, // Cambiado de personId a id
          supplie.name,
          supplie.description,
          supplie.price,
          supplie.state ? 'Activo' : 'Inactivo' // Mantenido el formato
      ]),
  });
  doc.save('Listado de Insumos.pdf'); // Cambiado de 'listado_de_usuarios.pdf' a 'listado_de_suministros.pdf'
}
onSearchChange(): void {
  this.filterSupplies();
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
  this.filterSupplies();
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
  return Math.ceil(this.filteredSupplies.length / this.itemsPerPage);
}

getPageNumbers(): number[] {
  return Array.from({ length: this.totalPages }, (_, i) => i + 1);
}

goToPage(page: number): void {
  this.currentPage = page;
}
hasSelected(): boolean {
  return this.supplies.some(supplie => supplie.selected); // Cambiado de crops a supplies
}
selectAll(event: any): void {
  const checked = event.target.checked;
  this.supplies.forEach(supplie => (supplie.selected = checked));
}

// Verificar si todos los roles están seleccionados
areAllSelected(): boolean {
  return this.supplies.length > 0 && this.supplies.every(supplie => supplie.selected);
}

deleteSelected(): void {
  const selectedIds = this.supplies.filter(supplie => supplie.selected).map(supplie => supplie.id); // Cambiado de crops a supplies y de personId a id

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
                      this.supplies = this.supplies.filter(supplie => !selectedIds.includes(supplie.id)); // Cambiado de crops a supplies
                      this.filterSupplies(); // Cambiado de filterCrops a filterSupplies (asegúrate de tener este método)
                      Swal.fire('¡Eliminados!', 'Los suministros seleccionados han sido eliminados.', 'success');
                  })
                  .catch((error) => {
                      console.error('Error eliminando suministros seleccionados:', error);
                      Swal.fire('Error', 'Hubo un problema al eliminar los suministros seleccionados.', 'error');
                  });
          }
      });
  } else {
      Swal.fire('Error', 'No hay suministros seleccionados para eliminar.', 'error');
  }
}



  openModal(): void {
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.resetForm();
  }

  onSubmit(form: NgForm): void {
    if (this.supplie.id === 0) {
      this.http.post(this.apiUrl, this.supplie).subscribe(() => {
        this.getsupplies();
        this.closeModal();
        Swal.fire('Éxito', 'Insumo creado con éxito!', 'success');
      });
    } else {
      this.http.put(this.apiUrl, this.supplie).subscribe(() => {
        this.getsupplies();
        this.closeModal();
        Swal.fire('Éxito', 'Insumo actualizado con éxito!', 'success');
      });
    }
  }

  editsupplie(supplie: any): void {
    this.supplie = { ...supplie };
    this.openModal();
  }

  deletesupplie(id: number): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: '¡No podrás revertir esto!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, ¡bórralo!',
      cancelButtonText: 'No, cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.http.delete(`${this.apiUrl}/${id}`).subscribe(() => {
          this.getsupplies();
          Swal.fire('¡Borrado!', 'El suministro ha sido eliminado.', 'success');
        });
      }
    });
  }

  resetForm(): void {
    this.supplie = { id: 0, name: '', description: '', code: '', price: 0, state: false };
  }
}
