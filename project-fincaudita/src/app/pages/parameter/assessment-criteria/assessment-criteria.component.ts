import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NgSelectModule } from '@ng-select/ng-select';
@Component({
  selector: 'app-assessment-criteria',
  standalone: true,
  imports: [HttpClientModule, FormsModule, CommonModule, NgbTypeaheadModule, NgSelectModule],
  templateUrl: './assessment-criteria.component.html',
  styleUrls: ['./assessment-criteria.component.css']
})
export class AssessmentCriteriaComponent implements OnInit {
  assesments: any[] = [];
  assesment: any = { id: 0, name: '', type_criterian: '', rating_range: '', state: false };
  isModalOpen = false;
  filteredCriteria: any[] = [];
  currentPage = 1;
  itemsPerPage = 5;
  searchTerm = '';
  itemsPerPageOptions = [5, 10, 20, 50];
  isDropdownOpen = false;

  private apiUrl = 'http://localhost:9191/api/AssesmentCriteria';

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  onlyPositiveNumbers(event: KeyboardEvent) {
    // Permitir solo números (0-9) y el punto (.) si es necesario
    const char = String.fromCharCode(event.keyCode);
    if (!/[0-9]/.test(char)) {
      event.preventDefault(); // Previene la entrada si no es válida
    }
  }

  ngOnInit(): void {
    this.getassesments();
  }

  getassesments(): void {
    this.http.get<any[]>(this.apiUrl).subscribe(
      (assesments) => {
        
        this.assesments = assesments;
        this.filterAssessments();
        this.cdr.detectChanges();
      },
      (error) => {
        console.error('Error fetching assesments:', error);
      }
    );
  }
  
  filterAssessments(): void {
    const search = this.searchTerm.toLowerCase().trim();
    this.filteredCriteria = this.assesments.filter(assesment =>
      assesment.name.toLowerCase().includes(search) || // Filtrar por nombre
      assesment.rating_range.toString().includes(search) || // Filtrar por rango de evaluación
      assesment.type_criterian.toLowerCase().includes(search) || // Filtrar por tipo de criterio
      (assesment.state ? 'activo' : 'inactivo').includes(search) // Filtrar por estado
    );
    this.currentPage = 1; // Resetear a la primera página
  }
  paginatedCriteria(): any[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredCriteria.slice(start, end);
  }

  exportToExcel(): void {
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.filteredCriteria);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Evaluaciones');
    XLSX.writeFile(workbook, 'listado de evaluaciones.xlsx');
  }
  

  exportToPDF(): void {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [['Nombre', 'Rango de Calificación', 'Tipo de Criterio', 'Estado']],
      body: this.filteredCriteria.map(assessment => [
        assessment.name,
        assessment.rating_range,
        assessment.type_criterian,
        assessment.state ? 'Activo' : 'Inactivo'
      ]),
    });
    doc.save('listado de evaluaciones.pdf');
  }
  onSearchChange(): void {
    this.filterAssessments();
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
    this.filterAssessments();
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
    return Math.ceil(this.filteredCriteria.length / this.itemsPerPage);
  }

  getPageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  goToPage(page: number): void {
    this.currentPage = page;
  }

  hasSelected(): boolean {
    return this.assesments.some(assessment => assessment.selected);
  }
  selectAll(event: any): void {
    const checked = event.target.checked;
    this.assesments.forEach(assesment => (assesment.selected = checked));
  }

  // Verificar si todos los roles están seleccionados
  areAllSelected(): boolean {
    return this.assesments.length > 0 && this.assesments.every(assesment => assesment.selected);
  }

  deleteSelected(): void {
    const selectedIds = this.assesments.filter(assessment => assessment.selected).map(assessment => assessment.id); // Asegúrate de que 'id' sea el campo correcto para identificar evaluaciones
  
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
              this.assesments = this.assesments.filter(assessment => !selectedIds.includes(assessment.id)); // Asegúrate de que 'id' sea el campo correcto
              this.filterAssessments(); // Asegúrate de tener un método similar para filtrar evaluaciones
              Swal.fire('¡Eliminados!', 'Las evaluaciones seleccionadas han sido eliminadas.', 'success');
            })
            .catch((error) => {
              console.error('Error eliminando evaluaciones seleccionadas:', error);
              Swal.fire('Error', 'Hubo un problema al eliminar las evaluaciones seleccionadas.', 'error');
            });
        }
      });
    } else {
      Swal.fire('Error', 'No hay evaluaciones seleccionadas para eliminar.', 'error');
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
    if (this.assesment.id === 0) {
      this.http.post(this.apiUrl, this.assesment).subscribe(() => {
        this.getassesments();
        this.closeModal();
        Swal.fire('Éxito', 'Criterio de evaluación creado con éxito.', 'success');
      });
    } else {
      this.http.put(this.apiUrl, this.assesment).subscribe(() => {
        this.getassesments();
        this.closeModal();
        Swal.fire('Éxito', 'Criterio de evaluación actualizado con éxito.', 'success');
      });
    }
  }

  editassesment(assesment: any): void {
    this.assesment = { ...assesment };
    this.openModal();
  }

  deleteassesment(id: number): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: '¡No podrás revertir esto!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, elimínalo',
      cancelButtonText: 'No, cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.http.delete(`${this.apiUrl}/${id}`).subscribe(() => {
          this.getassesments();
          Swal.fire('Eliminado', 'El criterio de evaluación ha sido eliminado.', 'success');
        });
      }
    });
  }

  resetForm(): void {
    this.assesment = { id: 0, name: '', type_criterian: '', rating_range: 0, state: false };
  }
}
