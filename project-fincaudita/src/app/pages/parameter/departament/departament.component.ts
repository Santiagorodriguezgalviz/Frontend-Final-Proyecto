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
@Component({
  selector: 'app-departament',
  standalone: true,
  imports: [HttpClientModule, FormsModule, CommonModule, NgbTypeaheadModule,MatInputModule,
    MatAutocompleteModule, NgSelectModule],
  templateUrl: './departament.component.html',
  styleUrl: './departament.component.css'
})
export class DepartamentComponent {

  departaments: any[] = [];
  departament: any = { id: 0, name: '', description: '', code: '', countryId: 0, state: false };
  countrys: any[] = [];
  isModalOpen = false;
  filteredDepartament: any[] = [];
  filteredCountrys: any[] = [];
  currentPage = 1;
  itemsPerPage = 20;
  searchTerm = '';
  itemsPerPageOptions = [20, 50, 100];
  isDropdownOpen = false;

  private apiUrl = 'http://localhost:9191/api/departament';
  private countrysUrl = 'http://localhost:9191/api/country';  

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  onlyAlphanumeric(event: KeyboardEvent) {
    const regex = /^[a-zA-Z0-9]*$/; // Solo permite letras y números
    if (!regex.test(event.key)) {
      event.preventDefault(); // Previene la entrada si no es válida
    }
  }
  
  searchcountrys(event: any): void {
    const term = event.target.value.toLowerCase();
    this.filteredCountrys = this.countrys.filter(country => 
      country.name.toLowerCase().includes(term)
    );
  }

  oncountrySelect(event: any): void {
    const selectedcountry = this.countrys.find(country => 
      country.name === event.option.value
    );
    if (selectedcountry) {
        this.departament.countryId = selectedcountry.id;
        this.departament.countryName = selectedcountry.name; // Agregar esto
        // Cierra el autocompletar
        this.filteredCountrys = [];
    }
}

getcountryName(id: number): string {
  const country = this.countrys.find(c => c.id === id);
  return country ? country.name : '';
}


  ngOnInit(): void {
    this.getdepartaments();
    this.getcountrys();
  }

  getdepartaments(): void {
    this.http.get<any[]>(this.apiUrl).subscribe(
      (departaments) => {
        
        this.departaments = departaments;
        this.filterDepartments();
        this.cdr.detectChanges();
      },
      (error) => {
        console.error('Error al obtener los departamentos:', error);
      }
    );
  }

  getcountrys(): void {
    this.http.get<any[]>(this.countrysUrl).subscribe(
      (countrys) => {
        this.countrys = countrys;
        console.log("PAISES", this.countrys);
      },
      (error) => {
        console.error('Error al obtener los países:', error);
      }
    );
  }

  filterDepartments(): void {
    const search = this.searchTerm.toLowerCase().trim();
    this.filteredDepartament = this.departaments.filter(departament =>
        departament.name.toLowerCase().includes(search) ||
        departament.description.toLowerCase().includes(search) ||
        this.getcountryName(departament.countryId)?.toLowerCase().includes(search) || // Filtrar por nombre de país
        departament.code.toLowerCase().includes(search) ||
        (departament.state ? 'activo' : 'inactivo').includes(search) // Filtrar por estado
    );
    this.currentPage = 1; // Resetear a la primera página
}
paginatedDepartament(): any[] {
  const start = (this.currentPage - 1) * this.itemsPerPage;
  const end = start + this.itemsPerPage;
  return this.filteredDepartament.slice(start, end);
}
exportToExcel(): void {
  const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.filteredDepartament);
  const workbook: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Departamentos');
  XLSX.writeFile(workbook, 'Listado de Departamentos.xlsx');
}

exportToPDF(): void {
  const doc = new jsPDF();
  autoTable(doc, {
      head: [['Nombre', 'Descripción', 'Código', 'Estado']],
      body: this.filteredDepartament.map(departament => [
          departament.name,
          departament.description,
          departament.code,
          departament.state ? 'Activo' : 'Inactivo'
      ]),
  });
  doc.save('Listado de Departamentos.pdf');
}
onSearchChange(): void {
  this.filterDepartments();
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
  this.filterDepartments();
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
  return Math.ceil(this.filteredDepartament.length / this.itemsPerPage);
}

getPageNumbers(): number[] {
  return Array.from({ length: this.totalPages }, (_, i) => i + 1);
}

goToPage(page: number): void {
  this.currentPage = page;
}
hasSelected(): boolean {
  return this.departaments.some(departament => departament.selected);
}

selectAll(event: any): void {
  const checked = event.target.checked;
  this.departaments.forEach(departament => (departament.selected = checked));
}

// Verificar si todos los roles están seleccionados
areAllSelected(): boolean {
  return this.departaments.length > 0 && this.departaments.every(departament => departament.selected);
}
deleteSelected(): void {
  const selectedIds = this.departaments.filter(departament => departament.selected).map(departament => departament.id); // Asegúrate de que 'id' es la propiedad correcta.

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
                      this.departaments = this.departaments.filter(departament => !selectedIds.includes(departament.id)); // Asegúrate de que 'id' es la propiedad correcta.
                      this.filterDepartments(); // Asegúrate de tener este método para filtrar departamentos.
                      Swal.fire('¡Eliminados!', 'Los departamentos seleccionados han sido eliminados.', 'success');
                  })
                  .catch((error) => {
                      console.error('Error eliminando departamentos seleccionados:', error);
                      Swal.fire('Error', 'Hubo un problema al eliminar los departamentos seleccionados.', 'error');
                  });
          }
      });
  } else {
      Swal.fire('Error', 'No hay departamentos seleccionados para eliminar.', 'error');
  }
}


  openModal(): void {
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.resetForm();
    this.filteredCountrys = [];
  }

  onSubmit(form: NgForm): void {
    if (!this.departament.countryId) {
      Swal.fire('Error', 'Debe seleccionar un país válido.', 'error');
      return;
    }
  
    if (this.departament.id === 0) {
      this.http.post(this.apiUrl, this.departament).subscribe(() => {
        this.getdepartaments();
        this.closeModal();
        Swal.fire('Éxito', '¡Departamento creado con éxito!', 'success');
      });
    } else {
      this.http.put(this.apiUrl, this.departament).subscribe(() => {
        this.getdepartaments();
        this.closeModal();
        Swal.fire('Éxito', '¡Departamento actualizado con éxito!', 'success');
      });
    }
  }

  editdepartament(departament: any): void {
    this.departament = { ...departament };
    const selectedCountry = this.countrys.find(dep => dep.id === this.departament.countryId);
    if (selectedCountry) {
        this.departament.countryName = selectedCountry.name; // Necesitas agregar esta propiedad a tu objeto departament
    }
    this.openModal();
  }

  deletedepartament(id: number): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: '¡No podrás revertir esto!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, ¡borrar!',
      cancelButtonText: 'No, cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.http.delete(`${this.apiUrl}/${id}`).subscribe(() => {
          this.getdepartaments();
          Swal.fire('¡Borrado!', 'El departamento ha sido eliminado.', 'success');
        });
      }
    });
  }

  resetForm(): void {
    this.departament = { id: 0, name: '', description: '', code: '', countryId: 0, state: false };
    this.filteredCountrys = [];
  }
}