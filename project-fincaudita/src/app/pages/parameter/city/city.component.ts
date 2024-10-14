import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { NgSelectModule } from '@ng-select/ng-select';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-city',
  standalone: true,
  imports: [HttpClientModule, FormsModule, CommonModule, NgbTypeaheadModule, MatInputModule,
    MatAutocompleteModule, NgSelectModule],
  templateUrl: './city.component.html',
  styleUrls: ['./city.component.css']
})
export class CityComponent implements OnInit {
  cities: any[] = [];
  city: any = { id: 0, name: '', description: '', code: '', departamentId: 0, state: false, };
  departaments: any[] = [];
  filteredDepartaments: any[] = [];
  isModalOpen = false;
  filteredCity: any[] = [];
  currentPage = 1;
  itemsPerPage = 20;
  searchTerm = '';
  itemsPerPageOptions = [20, 50, 100];
  isDropdownOpen = false;

  private apiUrl = 'http://localhost:9191/api/City';
  private departamentsUrl = 'http://localhost:9191/api/departament';  

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  onlyAlphanumeric(event: KeyboardEvent) {
    const regex = /^[a-zA-Z0-9]*$/; // Solo permite letras y números
    if (!regex.test(event.key)) {
      event.preventDefault(); // Previene la entrada si no es válida
    }
  }
  
  searchdepartaments(event: any): void {
    const term = event.target.value.toLowerCase();
    this.filteredDepartaments = this.departaments.filter(departament => 
      departament.name.toLowerCase().includes(term)
    );
  }

  ondepartamentSelect(event: any): void {
    const selecteddepartament = this.departaments.find(departament => 
      departament.name === event.option.value
    );
    if (selecteddepartament) {
        this.city.departamentId = selecteddepartament.id;
        this.city.departamentName = selecteddepartament.name; // Agregar esto
        // Cierra el autocompletar
        this.filteredDepartaments = [];
    }
}


  ngOnInit(): void {
    this.getCities();
    this.getdepartaments();
  }

  getCities(): void {
    this.http.get<any[]>(this.apiUrl).subscribe(
      (cities) => {
        this.cities = cities;
        this.filterCities();
        this.cdr.detectChanges();
      },
      (error) => {
        console.error('Error fetching cities:', error);
      }
    );
  }

  
  getdepartaments(): void {
    this.http.get<any[]>(this.departamentsUrl).subscribe(
      (departaments) => {
        this.departaments = departaments;
        console.log(this.departaments);
      },
      (error) => {
        console.error('Error fetching departaments:', error);
      }
    );
  }

  getdepartamentName(id: number): string {
    const departament = this.departaments.find(c => c.id === id);
    return departament ? departament.name : '';
  }


  filterCities(): void {
    const search = this.searchTerm.toLowerCase().trim();
    this.filteredCity = this.cities.filter(city =>
      city.name.toLowerCase().includes(search) ||
      city.description.toLowerCase().includes(search) ||
      this.getdepartamentName(city.departamentId)?.toLowerCase().includes(search) ||
      city.code.toString().includes(search) ||
      (city.state ? 'activo' : 'inactivo').includes(search)
    );
    this.currentPage = 1; // Resetear a la primera página
  }
  
  paginatedCity(): any[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredCity.slice(start, end);
  }
  exportToExcel(): void {
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.filteredCity);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ciudades');
    XLSX.writeFile(workbook, 'Listado de ciudades.xlsx');
  }

  exportToPDF(): void {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [['Nombre', 'Descripción', 'Departamento', 'Código', 'Estado']],
      body: this.filteredCity.map(city => [
        city.name,
        city.description,
        this.getdepartamentName(city.departamentId), // Obtén el nombre del departamento
        city.code,
        city.state ? 'Activo' : 'Inactivo'
      ]),
    });
    doc.save('Listado de Ciudades.pdf');
  }
  onSearchChange(): void {
    this.filterCities();
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
    this.filterCities();
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
    return Math.ceil(this.filteredCity.length / this.itemsPerPage);
  }

  getPageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  goToPage(page: number): void {
    this.currentPage = page;
  }

hasSelected(): boolean {
  return this.cities.some(city => city.selected);
}

selectAll(event: any): void {
  const checked = event.target.checked;
  this.cities.forEach(city => (city.selected = checked));
}

// Verificar si todos los roles están seleccionados
areAllSelected(): boolean {
  return this.cities.length > 0 && this.cities.every(city => city.selected);
}

deleteSelected(): void {
  const selectedIds = this.cities.filter(city => city.selected).map(city => city.id); // Asegúrate de usar la propiedad correcta para el ID

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
            this.cities = this.cities.filter(city => !selectedIds.includes(city.id)); // Asegúrate de usar la propiedad correcta para el ID
            this.filterCities(); // Asegúrate de tener un método para filtrar ciudades
            Swal.fire('¡Eliminadas!', 'Las ciudades seleccionadas han sido eliminadas.', 'success');
          })
          .catch((error) => {
            console.error('Error eliminando ciudades seleccionadas:', error);
            Swal.fire('Error', 'Hubo un problema al eliminar las ciudades seleccionadas.', 'error');
          });
      }
    });
  } else {
    Swal.fire('Error', 'No hay ciudades seleccionadas para eliminar.', 'error');
  }
}

  openModal(): void {
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.resetForm();
    this.filteredDepartaments = [];
  }

  onSubmit(form: NgForm): void {
    if (!this.city.departamentId) {
      Swal.fire('Error', 'Debe seleccionar un departamento válido.', 'error');
      return;
    }
  
    if (this.city.id === 0) {
      this.http.post(this.apiUrl, this.city).subscribe(() => {
        this.getCities();
        this.closeModal();
        Swal.fire('Éxito', 'Ciudad creada con éxito.', 'success');
      });
    } else {
      this.http.put(this.apiUrl, this.city).subscribe(() => {
        this.getCities();
        this.closeModal();
        Swal.fire('Éxito', 'Ciudad actualizada con éxito.', 'success');
      });
    }
  }

  editCity(city: any): void {
    this.city = { ...city };
    // Buscar el nombre del departamento y asignarlo al campo de autocompletar
    const selectedDepartament = this.departaments.find(dep => dep.id === this.city.departamentId);
    if (selectedDepartament) {
        this.city.departamentName = selectedDepartament.name; // Necesitas agregar esta propiedad a tu objeto city
    }
    this.openModal();
}

  deleteCity(id: number): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: '¡No podrás revertir esto!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'No, cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.http.delete(`${this.apiUrl}/${id}`).subscribe(() => {
          this.getCities();
          Swal.fire('Eliminado', 'La ciudad ha sido eliminada.', 'success');
        });
      }
    });
  }

  resetForm(): void {
    this.city = { id: 0, name: '', description: '', code: '', departamentId: 0, state: false };
    this.filteredDepartaments = [];
  }
}