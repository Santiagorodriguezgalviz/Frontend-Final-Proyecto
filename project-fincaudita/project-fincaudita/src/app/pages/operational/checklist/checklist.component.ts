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
  selector: 'app-checklist',
  standalone: true,
  imports: [HttpClientModule, FormsModule, CommonModule, NgbTypeaheadModule, NgSelectModule],
  templateUrl: './checklist.component.html',
  styleUrls: ['./checklist.component.css']
})
export class ChecklistComponent implements OnInit {
  checklists: any[] = [];
  checklist: any = { id: 0, code: '', calification_total: 0, state: false };
  isModalOpen = false;
  filteredChecklists: any[] = [];
  currentPage = 1;
  itemsPerPage = 5;
  searchTerm = '';
  itemsPerPageOptions = [5, 10, 20, 50];
  isDropdownOpen = false;
  private apiUrl = 'http://localhost:9191/api/checklist';

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.getChecklists();
  }

  getChecklists(): void {
    this.http.get<any[]>(this.apiUrl).subscribe(
      (checklists) => {
        this.checklists = checklists;
        this.filterChecklists();
        this.cdr.detectChanges();
      },
      (error) => {
        console.error('Error al obtener las listas de verificación:', error);
      }
    );
  }


  filterChecklists(): void {
    const search = this.searchTerm.toLowerCase().trim();
    this.filteredChecklists = this.checklists.filter(checklist => 
        checklist.code.toString().includes(search) || // Filtrar por código
        checklist.calification_total.toString().includes(search) || // Filtrar por calificación total
        (checklist.state ? 'activo' : 'inactivo').includes(search) // Filtrar por estado
    );
    this.currentPage = 1; // Resetear a la primera página
}

paginatedCheklists(): any[] {
  const start = (this.currentPage - 1) * this.itemsPerPage;
  const end = start + this.itemsPerPage;
  return this.filteredChecklists.slice(start, end);
}

exportToExcel(): void {
  const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.filteredChecklists);
  const workbook: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Checklists');
  XLSX.writeFile(workbook, 'Lista de chequeo.xlsx');
}

exportToPDF(): void {
  const doc = new jsPDF();
  autoTable(doc, {
      head: [['Código', 'Calificación Total', 'Estado']],
      body: this.filteredChecklists.map(checklist => [
          checklist.code,
          checklist.calification_total,
          checklist.state ? 'Activo' : 'Inactivo'
      ]),
  });
  doc.save('Lista de chequeo.pdf');
}
onSearchChange(): void {
  this.filterChecklists();
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
  this.filterChecklists();
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
  return Math.ceil(this.filteredChecklists.length / this.itemsPerPage);
}

getPageNumbers(): number[] {
  return Array.from({ length: this.totalPages }, (_, i) => i + 1);
}

goToPage(page: number): void {
  this.currentPage = page;
}
hasSelected(): boolean {
  return this.checklists.some(checklist => checklist.selected);
}
selectAll(event: any): void {
  const checked = event.target.checked;
  this.checklists.forEach(checklist => (checklist.selected = checked));
}

// Verificar si todos los roles están seleccionados
areAllSelected(): boolean {
  return this.checklists.length > 0 && this.checklists.every(checklist => checklist.selected);
}

deleteSelected(): void {
  const selectedIds = this.checklists.filter(checklist => checklist.selected).map(checklist => checklist.code);

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
                      this.checklists = this.checklists.filter(checklist => !selectedIds.includes(checklist.code));
                      this.filterChecklists(); // Cambia esto si tienes un método específico para filtrar checklists
                      Swal.fire('¡Eliminados!', 'Los checklists seleccionados han sido eliminados.', 'success');
                  })
                  .catch((error) => {
                      console.error('Error eliminando checklists seleccionados:', error);
                      Swal.fire('Error', 'Hubo un problema al eliminar los checklists seleccionados.', 'error');
                  });
          }
      });
  } else {
      Swal.fire('Error', 'No hay checklists seleccionados para eliminar.', 'error');
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
    if (this.checklist.id === 0) {
      this.http.post(this.apiUrl, this.checklist).subscribe(() => {
        this.getChecklists();
        this.closeModal();
        Swal.fire('Éxito', '¡Lista de chequeo creada con éxito!', 'success');
      });
    } else {
      this.http.put(this.apiUrl, this.checklist).subscribe(() => {
        this.getChecklists();
        this.closeModal();
        Swal.fire('Éxito', '¡Lista de chequeo actualizada con éxito!', 'success');
      });
    }
  }

  editChecklist(checklist: any): void {
    this.checklist = { ...checklist };
    this.openModal();
  }

  deleteChecklist(id: number): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: '¡No podrás revertir esto!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, ¡bórralo!',
      cancelButtonText: 'No, cancelar',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.http.delete(`${this.apiUrl}/${id}`).subscribe(() => {
          this.getChecklists();
          Swal.fire('¡Borrado!', 'Tu lista de verificación ha sido eliminada.', 'success');
        });
      }
    });
  }

  resetForm(): void {
    this.checklist = { id: 0, code: '', calification_total: 0, state: false };
  }
}
