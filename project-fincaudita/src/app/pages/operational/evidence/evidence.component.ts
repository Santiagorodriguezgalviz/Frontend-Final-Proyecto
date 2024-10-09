import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';
import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-evidence',
  standalone: true,
  imports: [HttpClientModule, FormsModule, CommonModule, NgbTypeaheadModule,NgSelectModule],
  templateUrl: './evidence.component.html',
  styleUrls: ['./evidence.component.css']
})
export class EvidenceComponent implements OnInit {
  evidences: any[] = [];
  evidence: any = { id: 0, code: '', document: '', reviewId: 0, state: false };
  reviews: any[] = [];  // Lista de revisiones
  isModalOpen = false;
  filteredEvidence: any[] = [];
  currentPage = 1;
  itemsPerPage = 5;
  searchTerm = '';
  itemsPerPageOptions = [5, 10, 20, 50];
  isDropdownOpen = false;

  private apiUrl = 'http://localhost:9191/api/evidence';
  private reviewsUrl = 'http://localhost:9191/api/ReviewTechnical';

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  searchReviewIds = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      map(term => term.length < 1 ? []
        : this.reviews.filter(review => review.id.toString().indexOf(term) > -1).slice(0, 10))
    );

  formatReviewId = (review: any) => review.id;

  onReviewIdSelect(event: any): void {
    const selectedReview = event.item;
    this.evidence.reviewId = selectedReview.id;  // Asigna el ID de la revisión seleccionada
  }

  ngOnInit(): void {
    this.getEvidences();
    this.getReviews();  // Cargar las revisiones al iniciar
  }

  viewDocument(evidence: any): void {
    let documentSrc = evidence.document;

    // Verificar si el string base64 no tiene el prefijo 'data:image/'
    if (!documentSrc.startsWith('data:image/')) {
        // Puedes asumir que el archivo es una imagen JPEG, o ajustar si esperas otro formato
        documentSrc = 'data:image/jpeg;base64,' + documentSrc;
    }

    Swal.fire({
      title: 'Documento',
      html: `<img src="${documentSrc}" alt="Documento" style="max-width: 100%; height: auto;">`, // Mostrar el base64 como imagen
      icon: 'info',
      confirmButtonText: 'Cerrar'
    });
  }    

  

  getEvidences(): void {
    this.http.get<any[]>(this.apiUrl).subscribe(
      (evidences) => {
        this.evidences = evidences;
        this.filterEvidences();
        this.cdr.detectChanges();
      },
      (error) => {
        console.error('Error fetching evidences:', error);
      }
    );
  }

  filterEvidences(): void {
    const search = this.searchTerm.toLowerCase().trim();
    this.filteredEvidence= this.evidences.filter(evidence =>
        evidence.code.toLowerCase().includes(search) ||
        evidence.document.toLowerCase().includes(search) ||
        evidence.reviewId.toString().includes(search) || // Asegúrate de que esto sea correcto
        (evidence.state ? 'activo' : 'inactivo').includes(search) // Filtrar por estado
    );
    this.currentPage = 1; // Resetear a la primera página
}
paginatedEvidence(): any[] {
  const start = (this.currentPage - 1) * this.itemsPerPage;
  const end = start + this.itemsPerPage;
  return this.filteredEvidence.slice(start, end);
}

exportToExcel(): void {
  const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.filteredEvidence);
  const workbook: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Evidencias');
  XLSX.writeFile(workbook, 'Listado de Evidencias.xlsx');
}

exportToPDF(): void {
  const doc = new jsPDF();
  autoTable(doc, {
      head: [['Código', 'Documento', 'ID de Revisión', 'Estado']],
      body: this.filteredEvidence.map(evidence => [
          evidence.code,
          evidence.document,
          evidence.reviewId,
          evidence.state ? 'Activo' : 'Inactivo'
      ]),
  });
  doc.save('Listado de Evidencias.pdf');
}
onSearchChange(): void {
  this.filterEvidences();
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
  this.filterEvidences();
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
  return Math.ceil(this.filteredEvidence.length / this.itemsPerPage);
}

getPageNumbers(): number[] {
  return Array.from({ length: this.totalPages }, (_, i) => i + 1);
}

goToPage(page: number): void {
  this.currentPage = page;
}
hasSelected(): boolean {
  return this.evidences.some(evidence => evidence.selected);
}

selectAll(event: any): void {
  const checked = event.target.checked;
  this.evidences.forEach(evidence => (evidence.selected = checked));
}

// Verificar si todos los roles están seleccionados
areAllSelected(): boolean {
  return this.evidences.length > 0 && this.evidences.every(evidence => evidence.selected);
}

deleteSelected(): void {
  const selectedIds = this.evidences.filter(evidence => evidence.selected).map(evidence => evidence.id); // Cambia 'id' por el identificador real

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
                      this.evidences = this.evidences.filter(evidence => !selectedIds.includes(evidence.id)); // Cambia 'id' por el identificador real
                      this.filterEvidences(); // Asegúrate de que este método esté definido
                      Swal.fire('¡Eliminados!', 'Las evidencias seleccionadas han sido eliminadas.', 'success');
                  })
                  .catch((error) => {
                      console.error('Error eliminando evidencias seleccionadas:', error);
                      Swal.fire('Error', 'Hubo un problema al eliminar las evidencias seleccionadas.', 'error');
                  });
          }
      });
  } else {
      Swal.fire('Error', 'No hay evidencias seleccionadas para eliminar.', 'error');
  }
}



  getReviews(): void {
    this.http.get<any[]>(this.reviewsUrl).subscribe(
      (reviews) => {
        this.reviews = reviews;
      },
      (error) => {
        console.error('Error fetching reviews:', error);
      }
    );
  }

  openModal(): void {
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.resetForm();
  }

  onSubmit(form: NgForm): void {
    if (!this.evidence.reviewId) {
      Swal.fire('Error', 'Debe seleccionar una revisión válida.', 'error');
      return;
    }

    if (this.evidence.id === 0) {
      this.http.post(this.apiUrl, this.evidence).subscribe(() => {
        this.getEvidences();
        this.closeModal();
        Swal.fire('Éxito', 'Evidencia creada exitosamente.', 'success');
      });
    } else {
      this.http.put(this.apiUrl, this.evidence).subscribe(() => {
        this.getEvidences();
        this.closeModal();
        Swal.fire('Éxito', 'Evidencia actualizada exitosamente.', 'success');
      });
    }
  }

  editEvidences(evidence: any): void {
    this.evidence = { ...evidence };
    this.openModal();
  }

  deleteEvidences(id: number): void {
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
        this.http.delete(`${this.apiUrl}/${id}`).subscribe(() => {
          this.getEvidences();
          Swal.fire('¡Eliminado!', 'La evidencia ha sido eliminada.', 'success');
        });
      }
    });
  }

  resetForm(): void {
    this.evidence = { id: 0, code: '', document: '', reviewId: 0, state: false };
  }
}