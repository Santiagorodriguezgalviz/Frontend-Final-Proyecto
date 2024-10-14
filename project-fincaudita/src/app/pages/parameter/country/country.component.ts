import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import Swal from 'sweetalert2';
import { NgSelectModule } from '@ng-select/ng-select';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-country',
  standalone: true,
  imports: [HttpClientModule, FormsModule, CommonModule,NgSelectModule],
  templateUrl: './country.component.html',
  styleUrls: ['./country.component.css']
})
export class CountryComponent implements OnInit {
  countries: any[] = [];
  country: any = { id: 0, name: '', description: '', code: '', state: false };
  isModalOpen = false;
  filteredcountry: any[] = [];
  currentPage = 1;
  itemsPerPage = 5;
  searchTerm = '';
  itemsPerPageOptions = [5, 10, 20, 50];
  isDropdownOpen = false;
  private apiUrl = 'http://localhost:9191/api/Country';

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.getCountries();
  }

  getCountries(): void {
    this.http.get<any[]>(this.apiUrl).subscribe(
      (countries) => {
        this.countries = countries;
        this.filterCountries();
        this.cdr.detectChanges();
      },
      (error) => {
        console.error('Error fetching countries:', error);
      }
    );
  }

  onlyAlphanumeric(event: KeyboardEvent) {
    const regex = /^[a-zA-Z0-9]*$/; // Solo permite letras y números
    if (!regex.test(event.key)) {
      event.preventDefault(); // Previene la entrada si no es válida
    }
  }
  
  filterCountries(): void {
    const search = this.searchTerm.toLowerCase().trim();
    this.filteredcountry = this.countries.filter(country =>
      country.name.toLowerCase().includes(search) ||
      country.description.toLowerCase().includes(search) ||
      country.code.toLowerCase().includes(search) ||
      (country.state ? 'activo' : 'inactivo').includes(search)
    );
    this.currentPage = 1; // Resetear a la primera página
  }

  paginatedCountry(): any[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredcountry.slice(start, end);
  }

  exportToExcel(): void {
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.filteredcountry);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Países');
    XLSX.writeFile(workbook, 'Listado de Paises.xlsx');
  }
  
  exportToPDF(): void {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [['Nombre', 'Descripción', 'Código', 'Estado']],
      body: this.filteredcountry.map(country => [
        country.name,
        country.description,
        country.code,
        country.state ? 'Activo' : 'Inactivo'
      ]),
    });
    doc.save('Listado de Paises.pdf');
  }
  
  

onSearchChange(): void {
  this.filterCountries();
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
  this.filterCountries();
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
  return Math.ceil(this.filteredcountry.length / this.itemsPerPage);
}

getPageNumbers(): number[] {
  return Array.from({ length: this.totalPages }, (_, i) => i + 1);
}

goToPage(page: number): void {
  this.currentPage = page;
}
hasSelected(): boolean {
  return this.countries.some(country => country.selected);
}
selectAll(event: any): void {
  const checked = event.target.checked;
  this.countries.forEach(country => (country.selected = checked));
}

// Verificar si todos los roles están seleccionados
areAllSelected(): boolean {
  return this.countries.length > 0 && this.countries.every(country => country.selected);
}

deleteSelected(): void {
  const selectedIds = this.countries.filter(country => country.selected).map(country => country.countryId);

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
                      this.countries = this.countries.filter(country => !selectedIds.includes(country.countryId));
                      this.filterCountries(); // Asegúrate de tener un método para filtrar los países
                      Swal.fire('¡Eliminados!', 'Los países seleccionados han sido eliminados.', 'success');
                  })
                  .catch((error) => {
                      console.error('Error eliminando países seleccionados:', error);
                      Swal.fire('Error', 'Hubo un problema al eliminar los países seleccionados.', 'error');
                  });
          }
      });
  } else {
      Swal.fire('Error', 'No hay países seleccionados para eliminar.', 'error');
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
    if (this.country.id === 0) {
      this.http.post(this.apiUrl, this.country).subscribe(() => {
        this.getCountries();
        this.closeModal();
        Swal.fire('Éxito', 'País creado con éxito.', 'success');
      });
    } else {
      this.http.put(this.apiUrl, this.country).subscribe(() => {
        this.getCountries();
        this.closeModal();
        Swal.fire('Éxito', 'País actualizado con éxito.', 'success');
      });
    }
  }

  editCountry(country: any): void {
    this.country = { ...country };
    this.openModal();
  }

  deleteCountry(id: number): void {
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
          this.getCountries();
          Swal.fire('Eliminado', 'El país ha sido eliminado.', 'success');
        });
      }
    });
  }

  resetForm(): void {
    this.country = { id: 0, name: '', description: '', code: '', state: false };
  }
}
