import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Component, OnInit, ElementRef, ChangeDetectorRef, ViewChild } from '@angular/core';
import { FormBuilder, FormsModule, NgForm, FormGroup, } from '@angular/forms';
import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
import SignaturePad from 'signature_pad';
import Swal from 'sweetalert2';
import { AfterViewInit } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
  selector: 'app-review-technical',
  standalone: true,
  imports: [HttpClientModule, FormsModule, CommonModule, NgSelectModule, NgbTypeaheadModule, MatInputModule,
    MatAutocompleteModule],
  templateUrl: './review-technical.component.html',
  styleUrls: ['./review-technical.component.css']
})
export class ReviewTechnicalComponent implements OnInit, AfterViewInit {

  review: any = {
    id: 0,
    date_review: new Date().toISOString().slice(0, 10),
    code: '',
    observation: '',
    tecnicoId: 0,
    tecnico: '',
    state: true,
    lotId: 0,
    lot: '',
    evidences: [{ code: '', document: '' }],
    checklists: {
      code: '',
      calification_total: 0,
      qualifications: [{ observation: '', qualification_criteria: '', assessmentCriteriaId: 0 }]
    }
  };
  reviews: any[] = [];
  farms: any[] = [];
  crops: any[] = [];
  users: any[] = [];
  isEditing = false;
  filteredUsers: any[] = [];
  filteredFarms: any[] = [];
  assessmentCriterias: any[] = [];
  califications: any[] = [];
  filteredReview: any[] = [];
  currentPage = 1;
  itemsPerPage = 5;
  searchTerm = '';
  itemsPerPageOptions = [5, 10, 20, 50];
  isDropdownOpen = false;
  isModalOpen = false;
  reviewTechnicalForm!: FormGroup;
  fileTechSelected = false;  // Para verificar si se ha seleccionado una imagen
  fileProdSelected = false;


  @ViewChild('signaturePadTech') signaturePadTechRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('signaturePadProd') signaturePadProdRef!: ElementRef<HTMLCanvasElement>;


  signaturePadTech!: SignaturePad;
  signaturePadProd!: SignaturePad;

  private apiUrl = 'http://localhost:9191/api/ReviewTechnical';
  private usersUrl = 'http://localhost:9191/api/User';
  private farmsUrl = 'http://localhost:9191/api/Farm';
  private assessmentCriteriaUrl = 'http://localhost:9191/api/Assesmentcriteria';

  private drawing = false;
  private context: CanvasRenderingContext2D | null = null;

  signatureTechDrawn = false;
  signatureProdDrawn = false;
  constructor(private http: HttpClient, private fb: FormBuilder, private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.getReviews();
    this.getUsers();
    this.getFarms();
    this.getAssessmentCriterias();
  }

    // Método para validar si la fecha está en el mes actual
    isDateInCurrentMonth(): boolean {
      if (!this.review.date_review) {
        return false; 
      }
  
      const selectedDate = new Date(this.review.date_review);
      const currentDate = new Date();
      
      return (
        selectedDate.getFullYear() === currentDate.getFullYear() &&
        selectedDate.getMonth() === currentDate.getMonth()
      );
    }
  
    // Método para verificar el estado de validación y mostrar mensajes de error
    isFormValid(): boolean {
      return this.isDateInCurrentMonth() && !!this.review.date_review;
    }

  onlyAlphanumeric(event: KeyboardEvent) {
    const regex = /^[a-zA-Z0-9]*$/; 
    if (!regex.test(event.key)) {
      event.preventDefault(); 
    }
  }

  ngAfterViewInit(): void {
    this.initializeSignaturePads();
  }

  initializeSignaturePads(): void {
    this.signaturePadTech = new SignaturePad(this.signaturePadTechRef.nativeElement);
    this.signaturePadProd = new SignaturePad(this.signaturePadProdRef.nativeElement);
  }

  filterReviews(): void {
    const search = this.searchTerm.toLowerCase().trim();
    this.filteredReview = this.reviews.filter(review =>
      review.code.toLowerCase().includes(search) ||
      this.formatDate(review.date_review).includes(search) || // Filtrar por fecha (formateada)
      this.getUserName(review.tecnicoId)?.toLowerCase().includes(search) || // Filtrar por técnico
      review.lot.toLowerCase().includes(search) || // Filtrar por lote
      review.observation.toLowerCase().includes(search) || // Filtrar por observación
      (review.state ? 'activo' : 'inactivo').includes(search) // Filtrar por estado
    );
    this.currentPage = 1; // Resetear a la primera página
  }
  
  // Método para formatear la fecha
  formatDate(date: Date): string {
    const formattedDate = new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
    return formattedDate;
  }
  
  paginatedReviews(): any[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredReview.slice(start, end);
  }
  
  exportToExcel(): void {
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.filteredReview);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reviews');
    XLSX.writeFile(workbook, 'listado_de_reviews.xlsx');
  }
  
  exportToPDF(): void {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [['Código', 'Fecha de Revisión', 'Técnico', 'Lote', 'Observación', 'Estado']],
      body: this.filteredReview.map(review => [
        review.code,
        this.formatDate(review.date_review),
        this.getUserName(review.tecnicoId),
        review.lot,
        review.observation,
        review.state ? 'Activo' : 'Inactivo'
      ]),
    });
    doc.save('listado_de_reviews.pdf');
  }

onSearchChange(): void {
  this.filterReviews();
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
  this.filterReviews();
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
  return Math.ceil(this.filteredReview.length / this.itemsPerPage);
}

getPageNumbers(): number[] {
  return Array.from({ length: this.totalPages }, (_, i) => i + 1);
}

goToPage(page: number): void {
  this.currentPage = page;
}

hasSelected(): boolean {
  return this.reviews.some(review => review.selected);
}

selectAll(event: any): void {
  const checked = event.target.checked;
  this.reviews.forEach(review => (review.selected = checked));
}

// Verificar si todas las reviews están seleccionadas
areAllSelected(): boolean {
  return this.reviews.length > 0 && this.reviews.every(review => review.selected);
}

deleteSelected(): void {
  const selectedIds = this.reviews.filter(review => review.selected).map(review => review.code);

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
            this.reviews = this.reviews.filter(review => !selectedIds.includes(review.code));
            this.filterReviews();
            Swal.fire('¡Eliminados!', 'Las reviews seleccionadas han sido eliminadas.', 'success');
          })
          .catch((error) => {
            console.error('Error eliminando reviews seleccionadas:', error);
            Swal.fire('Error', 'Hubo un problema al eliminar las reviews seleccionadas.', 'error');
          });
      }
    });
  } else {
    Swal.fire('Error', 'No hay reviews seleccionadas para eliminar.', 'error');
  }
}


  searchusers(event: any): void {
    const term = event.target.value.toLowerCase();
    this.filteredUsers = this.users.filter(user =>
      user.username.toLowerCase().includes(term)
    );
  }

  searchFarms(event: any): void {
    const term = event.target.value.toLowerCase();
    this.filteredFarms = this.farms.filter(farm =>
      farm.name.toLowerCase().includes(term) ||
      farm.lots.some((lot: { cultivo: string; }) => lot.cultivo.toLowerCase().includes(term))
    );
  }

  getReviews(): void {
    this.http.get<any[]>(this.apiUrl).subscribe(
      (reviews) => {
        this.reviews = reviews.map(review => ({
          ...review,
          date_review: new Date(review.date_review).toISOString().slice(0, 10)
        }));
        this.filterReviews();
      },
      (error) => {
        console.error('Error al cargar las revisiones:', error);
        this.cdr.detectChanges();
      }
    );
  }

  getUsers(): void {
    this.http.get<any[]>(this.usersUrl).subscribe(
      (users) => {
        this.users = users;
        console.log('Users loaded:', this.users);
      },
      (error) => {
        console.error('Error fetching users:', error);
      }
    );
  }

  getAssessmentCriterias(): void {
    this.http.get<any[]>(this.assessmentCriteriaUrl).subscribe(
      (criteria) => {
        this.assessmentCriterias = criteria.map(criterion => ({
          id: criterion.id,
          name: criterion.name
        }));

        this.califications = this.assessmentCriterias.map(criterion => ({
          observation: '',
          qualification_criteria: '',
          assessmentCriteriaId: criterion.id,
          name: criterion.name
        }));

        this.review.checklists.qualifications = this.califications

      },
      (error) => {
        console.error('Error fetching assessment criteria:', error);
      }
    );
  }

  getFarms(): void {
    this.http.get<any[]>(this.farmsUrl).subscribe(
      (farms) => {
        this.farms = farms;
        this.cdr.detectChanges();
      },
      (error) => {
        console.error('Error al cargar las granjas:', error);
      }
    );
  }

  onusersSelect(event: any): void {
    const selectedUser = this.users.find(user => user.username === event.option.value);
    if (selectedUser) {
      this.review.tecnicoId = selectedUser.id;
      this.review.tecnico = selectedUser.username;
      this.filteredUsers = [];
    }
  }

  onFarmSelect(event: any): void {
    const selectedFarm = this.farms.find(farm => farm.name === event.option.value);

    if (selectedFarm && selectedFarm.lots.length > 0) {
      const selectedLot = selectedFarm.lots[0];
      this.review.lotId = selectedLot.id;
      this.review.lot = `${selectedFarm.name}: ${selectedLot.cultivo}`;

      this.filteredFarms = [];
    }
  }

  getUserName(id: number): string {
    const user = this.users.find(u => u.id === id);
    return user ? user.username : 'Desconocido';
  }

  getFarmName(id: number): string {
    const farm = this.farms.find(f => f.id === id);
    return farm ? farm.name : 'Desconocido';
  }

  openModal(): void {
    this.isModalOpen = true;

  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isEditing = false;
    this.resetForm();
    this.isEditing = false;
    this.filteredUsers = [];
  }

  onFileChange(event: any, type: 'technician' | 'producer' | 'evidence'): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const base64String = e.target.result;
        if (type === 'technician') {
          this.review.signature_technician = base64String;
        } else if (type === 'producer') {
          this.review.signature_producer = base64String;
        } else if (type === 'evidence') {
          this.review.evidences[0] = {
            document: base64String,
            name: file.name,
            code: this.review.code
          };
        }
      };
      reader.readAsDataURL(file);
    }
  }


  onQualificationChange(): void {
    this.review.checklists.calification_total = this.calculateTotalQualification(this.review.checklists.qualifications);
  }

  calculateTotalQualification(qualifications: any[]): number {
    if (!qualifications || !Array.isArray(qualifications)) {
      return 0;
    }

    return qualifications.reduce((total, qualification) => {
      return total + (qualification.qualification_criteria || 0);
    }, 0);
  }



  startDrawing(type: 'technician' | 'producer', canvas: HTMLCanvasElement): void {
    this.drawing = true;
    this.context = canvas.getContext('2d');
    this.context?.beginPath();
  }

  stopDrawing(): void {
    this.drawing = false;
    this.context?.closePath();
  }

  draw(event: MouseEvent, canvas: HTMLCanvasElement): void {
    if (!this.drawing || !this.context) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.context.lineTo(x, y);
    this.context.stroke();
  }

  clearSignature(type: 'technician' | 'producer', canvas: HTMLCanvasElement): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Perderás los datos de la firma.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, limpiar',
      cancelButtonText: 'Cancelar',
      allowOutsideClick: false,
      customClass: {
        popup: 'modal-popup'
      }
    }).then((result) => {
      if (result.isConfirmed) {

        if (type === 'technician') {
          this.review.signature_technician = '';
        } else {
          this.review.signature_producer = '';
        }
        const context = canvas.getContext('2d');
        context?.clearRect(0, 0, canvas.width, canvas.height);

         // Opcional: Resetear el input file
         const fileInput = document.querySelector(`input[name="${type}"]`) as HTMLInputElement;
         if (fileInput) {
             fileInput.value = ''; // Limpiar el input file
         }

        Swal.fire({
          title: '¡Limpiado!',
          text: 'La firma ha sido limpiada.',
          icon: 'success',
          confirmButtonText: 'Aceptar',
          allowOutsideClick: false,
          customClass: {
            popup: 'modal-popup'
          }
        });
      }
    });
  }

  saveSignature(metodo: number): void {
    const technicianCanvas = this.signaturePadTechRef.nativeElement;
    const producerCanvas = this.signaturePadProdRef.nativeElement;

    const technicianDataURL = technicianCanvas.toDataURL();
    const producerDataURL = producerCanvas.toDataURL();

    const blankImageDataURL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAACWCAYAAABkW7XSAAAAAXNSR0IArs4c6QAABGJJREFUeF7t1AEJAAAMAsHZv/RyPNwSyDncOQIECEQEFskpJgECBM5geQICBDICBitTlaAECBgsP0CAQEbAYGWqEpQAAYPlBwgQyAgYrExVghIgYLD8AAECGQGDlalKUAIEDJYfIEAgI2CwMlUJSoCAwfIDBAhkBAxWpipBCRAwWH6AAIGMgMHKVCUoAQIGyw8QIJARMFiZqgQlQMBg+QECBDICBitTlaAECBgsP0CAQEbAYGWqEpQAAYPlBwgQyAgYrExVghIgYLD8AAECGQGDlalKUAIEDJYfIEAgI2CwMlUJSoCAwfIDBAhkBAxWpipBCRAwWH6AAIGMgMHKVCUoAQIGyw8QIJARMFiZqgQlQMBg+QECBDICBitTlaAECBgsP0CAQEbAYGWqEpQAAYPlBwgQyAgYrExVghIgYLD8AAECGQGDlalKUAIEDJYfIEAgI2CwMlUJSoCAwfIDBAhkBAxWpipBCRAwWH6AAIGMgMHKVCUoAQIGyw8QIJARMFiZqgQlQMBg+QECBDICBitTlaAECBgsP0CAQEbAYGWqEpQAAYPlBwgQyAgYrExVghIgYLD8AAECGQGDlalKUAIEDJYfIEAgI2CwMlUJSoCAwfIDBAhkBAxWpipBCRAwWH6AAIGMgMHKVCUoAQIGyw8QIJARMFiZqgQlQMBg+QECBDICBitTlaAECBgsP0CAQEbAYGWqEpQAAYPlBwgQyAgYrExVghIgYLD8AAECGQGDlalKUAIEDJYfIEAgI2CwMlUJSoCAwfIDBAhkBAxWpipBCRAwWH6AAIGMgMHKVCUoAQIGyw8QIJARMFiZqgQlQMBg+QECBDICBitTlaAECBgsP0CAQEbAYGWqEpQAAYPlBwgQyAgYrExVghIgYLD8AAECGQGDlalKUAIEDJYfIEAgI2CwMlUJSoCAwfIDBAhkBAxWpipBCRAwWH6AAIGMgMHKVCUoAQIGyw8QIJARMFiZqgQlQMBg+QECBDICBitTlaAECBgsP0CAQEbAYGWqEpQAAYPlBwgQyAgYrExVghIgYLD8AAECGQGDlalKUAIEDJYfIEAgI2CwMlUJSoCAwfIDBAhkBAxWpipBCRAwWH6AAIGMgMHKVCUoAQIGyw8QIJARMFiZqgQlQMBg+QECBDICBitTlaAECBgsP0CAQEbAYGWqEpQAAYPlBwgQyAgYrExVghIgYLD8AAECGQGDlalKUAIEDJYfIEAgI2CwMlUJSoCAwfIDBAhkBAxWpipBCRAwWH6AAIGMgMHKVCUoAQIGyw8QIJARMFiZqgQlQMBg+QECBDICBitTlaAECBgsP0CAQEbAYGWqEpQAAYPlBwgQyAgYrExVghIgYLD8AAECGQGDlalKUAIEDJYfIEAgI2CwMlUJSoCAwfIDBAhkBAxWpipBCRAwWH6AAIGMgMHKVCUoAQIGyw8QIJARMFiZqgQlQMBg+QECBDICBitTlaAECBgsP0CAQEbAYGWqEpQAgQdWMQCX4yW9owAAAABJRU5ErkJggg==";
    if (metodo == 0) {
      if (technicianDataURL !== blankImageDataURL || this.review.signature_technician) {
        this.review.signature_technician = this.review.signature_technician || technicianDataURL;
        this.review.evidences.push({ code: this.review.code, document: technicianDataURL });
      }

      if (producerDataURL !== blankImageDataURL || this.review.signature_producer) {
        this.review.signature_producer = this.review.signature_producer || producerDataURL;
        this.review.evidences.push({ code: this.review.code, document: producerDataURL });
      }
    } else if (metodo == 1) {
      const isTechnicianSignatureDifferent = this.review.signature_technician !== technicianDataURL && technicianDataURL !== blankImageDataURL;
      const isProducerSignatureDifferent = this.review.signature_producer !== producerDataURL && producerDataURL !== blankImageDataURL;

      if (isTechnicianSignatureDifferent) {
        this.review.signature_technician = technicianDataURL;
        this.review.evidences[1].document = technicianDataURL;
      }

      if (isProducerSignatureDifferent) {
        this.review.signature_producer = producerDataURL;
        this.review.evidences[2].document = producerDataURL;
      }
    }
}

  onSubmit(form: NgForm): void {

    const blankImageDataURL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAACWCAYAAABkW7XSAAAAAXNSR0IArs4c6QAABGJJREFUeF7t1AEJAAAMAsHZv/RyPNwSyDncOQIECEQEFskpJgECBM5geQICBDICBitTlaAECBgsP0CAQEbAYGWqEpQAAYPlBwgQyAgYrExVghIgYLD8AAECGQGDlalKUAIEDJYfIEAgI2CwMlUJSoCAwfIDBAhkBAxWpipBCRAwWH6AAIGMgMHKVCUoAQIGyw8QIJARMFiZqgQlQMBg+QECBDICBitTlaAECBgsP0CAQEbAYGWqEpQAAYPlBwgQyAgYrExVghIgYLD8AAECGQGDlalKUAIEDJYfIEAgI2CwMlUJSoCAwfIDBAhkBAxWpipBCRAwWH6AAIGMgMHKVCUoAQIGyw8QIJARMFiZqgQlQMBg+QECBDICBitTlaAECBgsP0CAQEbAYGWqEpQAAYPlBwgQyAgYrExVghIgYLD8AAECGQGDlalKUAIEDJYfIEAgI2CwMlUJSoCAwfIDBAhkBAxWpipBCRAwWH6AAIGMgMHKVCUoAQIGyw8QIJARMFiZqgQlQMBg+QECBDICBitTlaAECBgsP0CAQEbAYGWqEpQAAYPlBwgQyAgYrExVghIgYLD8AAECGQGDlalKUAIEDJYfIEAgI2CwMlUJSoCAwfIDBAhkBAxWpipBCRAwWH6AAIGMgMHKVCUoAQIGyw8QIJARMFiZqgQlQMBg+QECBDICBitTlaAECBgsP0CAQEbAYGWqEpQAAYPlBwgQyAgYrExVghIgYLD8AAECGQGDlalKUAIEDJYfIEAgI2CwMlUJSoCAwfIDBAhkBAxWpipBCRAwWH6AAIGMgMHKVCUoAQIGyw8QIJARMFiZqgQlQMBg+QECBDICBitTlaAECBgsP0CAQEbAYGWqEpQAAYPlBwgQyAgYrExVghIgYLD8AAECGQGDlalKUAIEDJYfIEAgI2CwMlUJSoCAwfIDBAhkBAxWpipBCRAwWH6AAIGMgMHKVCUoAQIGyw8QIJARMFiZqgQlQMBg+QECBDICBitTlaAECBgsP0CAQEbAYGWqEpQAAYPlBwgQyAgYrExVghIgYLD8AAECGQGDlalKUAIEDJYfIEAgI2CwMlUJSoCAwfIDBAhkBAxWpipBCRAwWH6AAIGMgMHKVCUoAQIGyw8QIJARMFiZqgQlQMBg+QECBDICBitTlaAECBgsP0CAQEbAYGWqEpQAAYPlBwgQyAgYrExVghIgYLD8AAECGQGDlalKUAIEDJYfIEAgI2CwMlUJSoCAwfIDBAhkBAxWpipBCRAwWH6AAIGMgMHKVCUoAQIGyw8QIJARMFiZqgQlQMBg+QECBDICBitTlaAECBgsP0CAQEbAYGWqEpQAAYPlBwgQyAgYrExVghIgYLD8AAECGQGDlalKUAIEDJYfIEAgI2CwMlUJSoCAwfIDBAhkBAxWpipBCRAwWH6AAIGMgMHKVCUoAQIGyw8QIJARMFiZqgQlQMBg+QECBDICBitTlaAECBgsP0CAQEbAYGWqEpQAgQdWMQCX4yW9owAAAABJRU5ErkJggg==";

    const isTechnicianSignatureValid = this.review.signature_technician || this.signaturePadTechRef.nativeElement.toDataURL() !== blankImageDataURL;
    const isProducerSignatureValid = this.review.signature_producer || this.signaturePadProdRef.nativeElement.toDataURL() !== blankImageDataURL;
  
    if (!isTechnicianSignatureValid) {
      Swal.fire('Error', 'Por favor, firma como técnico o subir una imagen de la firma.', 'error');
      return;
    }

    if (!isProducerSignatureValid) {
      Swal.fire('Error', 'Por favor, firma como productor o subir una imagen de la firma.', 'error');
      return;
    }

    if (!this.review.evidences[0]?.document) {
        Swal.fire('Error', 'Por favor, carga una imagen de evidencia del cultivo.', 'error');
        return;
    }

    this.review.checklists.calification_total = this.calculateTotalQualification(this.review.checklists.qualifications);

    if (this.review.id === 0) {
      this.saveSignature(0)
      this.http.post(this.apiUrl, this.review).subscribe({
        next: () => {
          this.getReviews();
          this.closeModal();
          Swal.fire('Éxito', 'Revision técnica  creado exitosamente!', 'success');
        },
        error: (error) => {
          console.error('Error al crear revision técnica :', error);
          Swal.fire('Error', 'Hubo un problema al crear el revision técnica .', 'error');
        }
      });
    } else {
      this.saveSignature(1)
      this.http.put(this.apiUrl, this.review).subscribe({
        next: () => {
          this.getReviews();
          this.closeModal();
          Swal.fire('Éxito', 'Revision técnica actualizado correctamente!', 'success');
        },
        error: (error) => {
          console.error('Error al actualizar revision técnica :', error);
          Swal.fire('Error', 'Hubo un problema al actualizar la revision técnica', 'error');
        }
      });
    }
  }

  editReview(reviewId: number): void {
    this.http.get<any>(`${this.apiUrl}/${reviewId}`).subscribe(
      (review) => {
        this.review = { ...review };
        const evidences = this.review.evidences.map((evidence: any) => {
          let documentSrc = evidence.document;

          if (!documentSrc.startsWith('data:image/')) {
            documentSrc = 'data:image/jpeg;base64,' + documentSrc;
          }

          return {
            ...evidence,
            code: this.review.code,
            document: documentSrc
          };
        });

        this.review.signature_technician = evidences[1]?.document
        this.review.signature_producer = evidences[2]?.document
        this.review.date_review = new Date(review.date_review).toISOString().slice(0, 10);


        this.califications = this.assessmentCriterias.map(criterion => {
          const matchingQualification = review.checklists.qualifications.find((q: any) => q.assessmentCriteriaId === criterion.id);
          return {
            observation: matchingQualification?.observation || '',
            qualification_criteria: matchingQualification?.qualification_criteria || 0,
            assessmentCriteriaId: criterion.id,
            name: criterion.name
          };
        });

        this.review.checklists.qualifications = this.califications;
        //delete this.review.checklists.id

        const selectedUser = this.users.find(user => user.id === this.review.tecnicoId);
        if (selectedUser) {
          this.review.tecnico = selectedUser.username;
        }

        if (review.evidences && review.evidences.length > 0) {
          this.review.evidences = review.evidences;
        }
        this.review.evidences = evidences;

        this.isEditing = true;
        this.openModal();
      },
      (error) => {
        console.error('Error al obtener la revisión:', error);
        Swal.fire('Error', 'Hubo un problema al cargar la revisión.', 'error');
      }
    );
  }

  deleteReview(id: number): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: '¡No podrás revertir esto!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, ¡elimínalo!',
      cancelButtonText: 'No, cancelar'
    }).then((result) => {
      if (result.isConfirmed) {

        this.http.delete(`${this.apiUrl}/${id}`).subscribe(() => {
          this.getReviews();
          Swal.fire('¡Eliminado!', 'La revision tecnica ha sido eliminada.', 'success');
        });
      }
    });
  }

  resetForm(): void {
    this.review = {
      id: 0,
      date_review: '',
      code: '',
      tecnicoId: 0,
      tecnico: '',
      state: true,
      lotId: 0,
      lot: '',
      evidences: [{ code: '', document: '' }],
      checklists: {
        id: 0,
        code: '',
        calification_total: 0,
        qualifications: [{ observation: '', qualification_criteria: '', assessmentCriteriaId: 0 }]
      }
    };
    const technicianFileInput = document.querySelector('input[name="technician"]') as HTMLInputElement;
    const producerFileInput = document.querySelector('input[name="producer"]') as HTMLInputElement;

    technicianFileInput.value = '';
    producerFileInput.value = '';
    this.signaturePadTech.clear();
    this.signaturePadProd.clear();
    this.getAssessmentCriterias()
    this.filteredUsers = [];
    this.filteredFarms = [];
    this.clearEvidence();
  }

  clearEvidence(): void {
    this.review.evidences[0] = {
      document: null,
      name: ''
    };
    const fileInput = document.getElementById('evidence') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  adjustHeight(event: any) {
    const textarea = event.target;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }
}