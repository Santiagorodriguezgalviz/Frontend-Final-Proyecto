import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-crop',
  standalone: true,
  imports: [HttpClientModule, FormsModule, CommonModule, NgSelectModule],
  templateUrl: './crop.component.html',
  styleUrls: ['./crop.component.css']  // Corregido de styleUrl a styleUrls
})
export class CropComponent implements OnInit {
  crops: any[] = [];
  crop: any = { id: 0, name: '', description: '', code: '', state: false };
  isModalOpen = false;
  filteredCrop: any[] = [];
  currentPage = 1;
  itemsPerPage = 5;
  searchTerm = '';
  itemsPerPageOptions = [5, 10, 20, 50];
  isDropdownOpen = false;

  private apiUrl = 'http://localhost:9191/api/Crop';

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  
  onlyAlphanumeric(event: KeyboardEvent) {
    const regex = /^[a-zA-Z0-9]*$/; // Solo permite letras y números
    if (!regex.test(event.key)) {
      event.preventDefault(); // Previene la entrada si no es válida
    }
  }
  
  ngOnInit(): void {
    this.getCrops();
  }

  getCrops(): void {
    this.http.get<any[]>(this.apiUrl).subscribe(
      (crops) => {
        this.crops = crops;
        this.filterCrops();
        this.cdr.detectChanges();
      },
      (error) => {
        console.error('Error al obtener los cultivos:', error);
      }
    );
  }

  filterCrops(): void {
    const search = this.searchTerm.toLowerCase().trim();
    this.filteredCrop = this.crops.filter(crop =>
        crop.name.toLowerCase().includes(search) ||
        crop.description.toLowerCase().includes(search) ||
        crop.code.toLowerCase().includes(search) ||
        (crop.state ? 'activo' : 'inactivo').includes(search)
    );
    this.currentPage = 1; // Resetear a la primera página
}
paginatedCrop(): any[] {
  const start = (this.currentPage - 1) * this.itemsPerPage;
  const end = start + this.itemsPerPage;
  return this.filteredCrop.slice(start, end);
}
exportToExcel(): void {
  const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.filteredCrop);
  const workbook: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Cultivos');
  XLSX.writeFile(workbook, 'Listado de Cultivos.xlsx');
}

exportToPDF(): void {
  const doc = new jsPDF();
  autoTable(doc, {
      head: [['Nombre', 'Descripción', 'Código', 'Estado']],
      body: this.filteredCrop.map(crop => [
          crop.name,
          crop.description,
          crop.code,
          crop.state ? 'Activo' : 'Inactivo'
      ]),
  });
  doc.save('Listado de Cultivos.pdf');
}
onSearchChange(): void {
  this.filterCrops();
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
  this.filterCrops();
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
  return Math.ceil(this.filteredCrop.length / this.itemsPerPage);
}

getPageNumbers(): number[] {
  return Array.from({ length: this.totalPages }, (_, i) => i + 1);
}

goToPage(page: number): void {
  this.currentPage = page;
}
hasSelected(): boolean {
  return this.crops.some(crop => crop.selected);
}

selectAll(event: any): void {
  const checked = event.target.checked;
  this.crops.forEach(crop => (crop.selected = checked));
}

// Verificar si todos los roles están seleccionados
areAllSelected(): boolean {
  return this.crops.length > 0 && this.crops.every(crop => crop.selected);
}

deleteSelected(): void {
  const selectedIds = this.crops.filter(crop => crop.selected).map(crop => crop.id); // Asegúrate de que el ID sea el correcto

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
                      this.crops = this.crops.filter(crop => !selectedIds.includes(crop.id));
                      this.filterCrops(); // Asegúrate de que este método esté definido
                      Swal.fire('¡Eliminados!', 'Los cultivos seleccionados han sido eliminados.', 'success');
                  })
                  .catch((error) => {
                      console.error('Error eliminando cultivos seleccionados:', error);
                      Swal.fire('Error', 'Hubo un problema al eliminar los cultivos seleccionados.', 'error');
                  });
          }
      });
  } else {
      Swal.fire('Error', 'No hay cultivos seleccionados para eliminar.', 'error');
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
    if (this.crop.id === 0) {
      this.http.post(this.apiUrl, this.crop).subscribe(() => {
        this.getCrops();
        this.closeModal();
        Swal.fire('Éxito', 'Cultivo creado con éxito.', 'success');
      });
    } else {
      this.http.put(this.apiUrl, this.crop).subscribe(() => {
        this.getCrops();
        this.closeModal();
        Swal.fire('Éxito', 'Cultivo actualizado con éxito.', 'success');
      });
    }
  }

  editCrop(crop: any): void {
    this.crop = { ...crop };
    this.openModal();
  }

  deleteCrop(id: number): void {
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
          this.getCrops();
          Swal.fire('Eliminado', 'El cultivo ha sido eliminado.', 'success');
        });
      }
    });
  }

  resetForm(): void {
    this.crop = { id: 0, name: '', description: '', code: '', state: false };
  }
}
