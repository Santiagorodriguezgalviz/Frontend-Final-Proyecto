import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule, NgForm } from '@angular/forms';
import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { NgSelectModule } from '@ng-select/ng-select';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-qualification',
  standalone: true,
  imports: [HttpClientModule, FormsModule, CommonModule, NgbTypeaheadModule, NgSelectModule],
  templateUrl: './qualification.component.html',
  styleUrls: ['./qualification.component.css']
})
export class QualificationComponent implements OnInit {
  califications: any[] = [];
  calification: any = { id: 0, observation: '', qualification_criteria: 0, assesmentCriteriaId: 0, checklistId: 0, state: false };
  assessmentCriteria: any[] = [];
  checklists: any[] = [];
  isModalOpen = false;
  filteredQualifications: any[] = [];
  currentPage = 1;
  itemsPerPage = 5;
  searchTerm = '';
  itemsPerPageOptions = [5, 10, 20, 50];
  isDropdownOpen = false;

  private calificationsUrl = 'http://localhost:9191/api/qualification';
  private assessmentCriteriaUrl = 'http://localhost:9191/api/AssesmentCriteria';
  private checklistsUrl = 'http://localhost:9191/api/checklist';

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.getCalifications();
    this.getAssessmentCriteria();
    this.getChecklists();
  }

  getCalifications(): void {
    this.http.get<any[]>(this.calificationsUrl).subscribe(
      (califications) => {
        this.califications = califications;
        this.filterCalifications();
        this.cdr.detectChanges();
      },
      (error) => {
        console.error('Error fetching califications:', error);
      }
    );
  }

  filterCalifications(): void {
    const search = this.searchTerm.toLowerCase().trim();
    
    this.filteredQualifications = this.califications.filter(calification =>
      calification.observation.toLowerCase().includes(search) || 
      String(calification.qualification_criteria).toLowerCase().includes(search) ||
      String(this.getAssessmentCriteriaName(calification.assessmentCriteriaId)).toLowerCase().includes(search) ||
      String(this.getChecklistName(calification.checklistId)).toLowerCase().includes(search) ||
      (calification.state ? 'Activo' : 'Inactivo').includes(search) // Filter by state
    );
  }
  
  paginatedCalifications(): any[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredQualifications.slice(start, end);
  }

  exportToExcel(): void {
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.filteredQualifications.map(calification => ({
      Observación: calification.observation,
      'Criterio de Calificación': calification.qualification_criteria,
      'Nombre del Criterio de Evaluación': this.getAssessmentCriteriaName(calification.assessmentCriteriaId),
      'Nombre del Checklist': this.getChecklistName(calification.checklistId),
      Estado: calification.state ? 'Activo' : 'Inactivo'
    })));
    
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Calificaciones');
    XLSX.writeFile(workbook, 'Listado de Calificaciones.xlsx');
  }

  exportToPDF(): void {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [['Observación', 'Criterio de Calificación', 'Nombre del Criterio de Evaluación', 'Nombre del Checklist', 'Estado']],
      body: this.filteredQualifications.map(calification => [
        calification.observation,
        calification.qualification_criteria,
        this.getAssessmentCriteriaName(calification.assessmentCriteriaId),
        this.getChecklistName(calification.checklistId),
        calification.state ? 'Activo' : 'Inactivo'
      ]),
    });
    doc.save('Listado de Calificaciones.pdf');
  }
  onSearchChange(): void {
    this.filterCalifications();
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
  hasSelected(): boolean {
    return this.califications.some(calification => calification.selected);
  }

  selectAll(event: any): void {
    const checked = event.target.checked;
    this.califications.forEach(calification => (calification.selected = checked));
  }
  
  // Verificar si todos los roles están seleccionados
  areAllSelected(): boolean {
    return this.califications.length > 0 && this.califications.every(calification => calification.selected);
  }

  deleteSelected(): void {
    const selectedIds = this.califications.filter(calification => calification.selected).map(calification => calification.id); // Assuming id is the unique identifier

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
                const deleteRequests = selectedIds.map(id => this.http.delete(`${this.calificationsUrl}/${id}`).toPromise());

                Promise.all(deleteRequests)
                    .then(() => {
                        this.califications = this.califications.filter(calification => !selectedIds.includes(calification.id));
                        this.filterCalifications(); // Ensure you have a filtering method for califications
                        Swal.fire('¡Eliminados!', 'Las calificaciones seleccionadas han sido eliminadas.', 'success');
                    })
                    .catch((error) => {
                        console.error('Error eliminando calificaciones seleccionadas:', error);
                        Swal.fire('Error', 'Hubo un problema al eliminar las calificaciones seleccionadas.', 'error');
                    });
            }
        });
    } else {
        Swal.fire('Error', 'No hay calificaciones seleccionadas para eliminar.', 'error');
    }
}

  

  updatePagination(): void {
    this.currentPage = 1;
    this.filterCalifications();
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
    return Math.ceil(this.filteredQualifications.length / this.itemsPerPage);
  }

  getPageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  goToPage(page: number): void {
    this.currentPage = page;
  }
  
  getAssessmentCriteria(): void {
    this.http.get<any[]>(this.assessmentCriteriaUrl).subscribe(
      (criteria) => {
        this.assessmentCriteria = criteria;
      },
      (error) => {
        console.error('Error fetching assessment criteria:', error);
      }
    );
  }

  getChecklists(): void {
    this.http.get<any[]>(this.checklistsUrl).subscribe(
      (checklists) => {
        this.checklists = checklists;
      },
      (error) => {
        console.error('Error fetching checklists:', error);
      }
    );
  }

  searchAssessmentCriteria = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      map(term => term.length < 1 ? [] : this.assessmentCriteria
        .filter(criteria => criteria.name?.toLowerCase().includes(term.toLowerCase())).slice(0, 10))
    );

  searchChecklists = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      map(term => term.length < 1 ? [] : this.checklists
        .filter(checklist => checklist.calification_total?.toLowerCase().includes(term.toLowerCase())).slice(0, 10))
    );

  formatAssessmentCriteria = (criteria: any) => criteria.name;
  formatChecklist = (checklist: any) => checklist.calification_total;

  onAssessmentCriteriaSelect(event: any): void {
    this.calification.assesmentCriteriaId = event.item.id;
  }

  onChecklistSelect(event: any): void {
    this.calification.checklistId = event.item.id;
  }

  openModal(): void {
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.resetForm();
  }

  onSubmit(form: NgForm): void {
    if (this.calification.id === 0) {
      this.http.post(this.calificationsUrl, this.calification).subscribe(() => {
        this.getCalifications();
        this.closeModal();
        Swal.fire('Éxito', 'La calificación ha sido creada con éxito.', 'success');
      });
    } else {
      this.http.put(this.calificationsUrl, this.calification).subscribe(() => {
        this.getCalifications();
        this.closeModal();
        Swal.fire('Éxito', 'La calificación ha sido actualizada con éxito.', 'success');
      });
    }
  }

  editCalification(calification: any): void {
    this.calification = { ...calification };
    this.openModal();
  }

  deleteCalification(id: number): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: '¡No podrás revertir esto!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminarlo!',
      cancelButtonText: 'No, cancelar!',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.http.delete(`${this.calificationsUrl}/${id}`).subscribe(() => {
          this.getCalifications();
          Swal.fire('Eliminado!', 'La calificación ha sido eliminada.', 'success');
        });
      }
    });
  }

  resetForm(): void {
    this.calification = { id: 0, observation: '', qualification_criteria: 0, assesmentCriteriaId: 0, checklistId: 0, state: false };
  }

  getAssessmentCriteriaName(id: number): string {
    const criteria = this.assessmentCriteria.find(c => c.id === id);
    return criteria ? criteria.name : '';
  }

  getChecklistName(id: number): string {
    const checklist = this.checklists.find(c => c.id === id);
    return checklist ? checklist.calification_total : '';
  }
}
