import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule, NgForm } from '@angular/forms';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NgSelectModule } from '@ng-select/ng-select';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';


interface Modulo {
  id: number;
  name: string;
  description: string;
  position: number | null;
  state: boolean;
  selected: boolean;
}

@Component({
  selector: 'app-modulo',
  standalone: true,
  imports: [HttpClientModule, CommonModule, FormsModule, NgSelectModule, FontAwesomeModule, NgbModule],
  templateUrl: './modulo.component.html',
  styleUrls: ['./modulo.component.css']
})
export class ModuloComponent implements OnInit {
  modulos: Modulo[] = [];
  modulo: Modulo = { id: 0, name: '', description: '', position: null, state: true, selected: false };
  isModalOpen = false;
  filteredModulos: Modulo[] = [];
  currentPage = 1;
  itemsPerPage = 5;
  searchTerm = '';
  itemsPerPageOptions = [5, 10, 20, 50];
  isDropdownOpen = false;
  moduloForm!: FormGroup;

  private apiUrl = 'http://localhost:9191/api/Modulo';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder,
  ) { }



  onInputChange(field: any) {
    field.control.updateValueAndValidity();
  }

  ngOnInit(): void {
    this.getModulos();

  }


  onlyPositiveNumbers(event: KeyboardEvent) {
    // Permitir solo números (0-9) y el punto (.) si es necesario
    const char = String.fromCharCode(event.keyCode);
    if (!/[0-9]/.test(char)) {
      event.preventDefault(); // Previene la entrada si no es válida
    }
  }
  // Obtener la lista de módulos desde la API
  getModulos(): void {
    this.http.get<Modulo[]>(this.apiUrl).subscribe(
      (modulos) => {
        this.modulos = modulos.map(modulo => ({ ...modulo, selected: false }));
        this.filterModulos();
        this.cdr.detectChanges();
      },
      (error) => {
        console.error('Error fetching módulos:', error);
      }
    );
  }

  // Filtrar módulos según el término de búsqueda
  filterModulos(): void {
    const search = this.searchTerm.toLowerCase().trim();
    this.filteredModulos = this.modulos.filter(modulo =>
      modulo.name.toLowerCase().includes(search) ||
      modulo.description.toLowerCase().includes(search) ||
      modulo.position?.toString().includes(search) ||
      (modulo.state ? 'activo' : 'inactivo').includes(search)
    );
    this.currentPage = 1; // Resetear a la primera página
  }

  // Obtener los módulos para la página actual
  paginatedModulos(): Modulo[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredModulos.slice(start, end);
  }

  // Manejar el cambio en el número de ítems por página
  updatePagination(): void {
    this.currentPage = 1;
    this.filterModulos();
  }

  // Abrir el modal para agregar o editar un módulo
  openModal(): void {
    this.isModalOpen = true;
  }

  // Cerrar el modal y reiniciar el formulario
  closeModal(): void {
    this.isModalOpen = false;
    this.resetForm();
  }

  // Reiniciar el formulario
  resetForm(): void {
    this.modulo = { id: 0, name: '', description: '', position: null, state: false, selected: false };
  }

  // Manejar el envío del formulario para agregar o editar un módulo
  onSubmit(form: NgForm): void {
    if (this.modulo.name.trim() === '' || this.modulo.description.trim() === '') {
      Swal.fire('Error', 'Por favor, complete todos los campos requeridos.', 'error');
      return;
    }

    if (this.modulo.id === 0) {
      // Crear nuevo módulo
      this.http.post<Modulo>(this.apiUrl, this.modulo).subscribe(
        (newModulo) => {
          this.modulos.push({ ...newModulo, selected: false });
          this.filterModulos();
          this.closeModal();
          Swal.fire('Éxito', '¡Módulo creado exitosamente!', 'success');
        },
        (error) => {
          console.error('Error creando módulo:', error);
          Swal.fire('Error', 'Hubo un problema al crear el módulo.', 'error');
        }
      );
    } else {
      // Actualizar módulo existente
      this.http.put(this.apiUrl, this.modulo).subscribe(
        () => {
          const index = this.modulos.findIndex(m => m.id === this.modulo.id);
          if (index !== -1) {
            this.modulos[index] = { ...this.modulo, selected: false };
            this.filterModulos();
          }
          this.closeModal();
          Swal.fire('Éxito', '¡Módulo actualizado exitosamente!', 'success');
        },
        (error) => {
          console.error('Error actualizando módulo:', error);
          Swal.fire('Error', 'Hubo un problema al actualizar el módulo.', 'error');
        }
      );
    }
  }

  // Editar un módulo existente
  editModulo(modulo: Modulo): void {
    this.modulo = { ...modulo };
    this.openModal();
  }

  // Eliminar un módulo individual
  deleteModulo(id: number): void {
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
        this.http.delete(`${this.apiUrl}/${id}`).subscribe(
          () => {
            this.modulos = this.modulos.filter(modulo => modulo.id !== id);
            this.filterModulos();
            Swal.fire('¡Eliminado!', 'El módulo ha sido eliminado.', 'success');
          },
          (error) => {
            console.error('Error eliminando módulo:', error);
            Swal.fire('Error', 'Hubo un problema al eliminar el módulo.', 'error');
          }
        );
      }
    });
  }

  // Seleccionar o deseleccionar todos los módulos
  selectAll(event: any): void {
    const checked = event.target.checked;
    this.modulos.forEach(modulo => (modulo.selected = checked));
  }

  // Verificar si todos los módulos están seleccionados
  areAllSelected(): boolean {
    return this.modulos.length > 0 && this.modulos.every(modulo => modulo.selected);
  }

  // Verificar si al menos un módulo está seleccionado
  hasSelected(): boolean {
    return this.modulos.some(modulo => modulo.selected);
  }

  // Eliminar los módulos seleccionados
  deleteSelected(): void {
    const selectedIds = this.modulos.filter(modulo => modulo.selected).map(modulo => modulo.id);

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
              this.modulos = this.modulos.filter(modulo => !selectedIds.includes(modulo.id));
              this.filterModulos();
              Swal.fire('¡Eliminados!', 'Los módulos seleccionados han sido eliminados.', 'success');
            })
            .catch((error) => {
              console.error('Error eliminando módulos seleccionados:', error);
              Swal.fire('Error', 'Hubo un problema al eliminar los módulos seleccionados.', 'error');
            });
        }
      });
    } else {
      Swal.fire('Error', 'No hay módulos seleccionados para eliminar.', 'error');
    }
  }

  // Exportar la lista de módulos a Excel
  exportToExcel(): void {
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.filteredModulos);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Módulos');
    XLSX.writeFile(workbook, 'listado_de_modulos.xlsx');
  }

  // Exportar la lista de módulos a PDF


  exportToPDF(): void {
    const doc = new jsPDF();

    // Agregar un título
    doc.setFontSize(20);
    doc.text('Listado de Módulos', 14, 20); // Título del PDF

    // Configurar la tabla con estilos
    autoTable(doc, {
      head: [['ID', 'Nombre', 'Descripción', 'Posición', 'Estado']],
      body: this.filteredModulos.map(modulo => [
        modulo.id,
        modulo.name,
        modulo.description,
        modulo.position,
        modulo.state ? 'Activo' : 'Inactivo'
      ]),
      startY: 30, // Comienza la tabla después del título
      theme: 'striped', // Estilo de tabla 'striped'
      headStyles: {
        fillColor: [0, 102, 204], // Color de fondo de los encabezados (azul)
        textColor: [255, 255, 255], // Color del texto (blanco)
        fontStyle: 'bold', // Estilo de fuente en negrita
      },
      bodyStyles: {
        fillColor: [240, 240, 240], // Color de fondo de las filas (gris claro)
        textColor: [0, 0, 0], // Color del texto (negro)
      },
      alternateRowStyles: {
        fillColor: [255, 255, 255], // Color de fondo de las filas alternas (blanco)
      },
      margin: { top: 30, right: 10, bottom: 10, left: 10 }, // Márgenes de la tabla
      styles: {
        fontSize: 12, // Tamaño de fuente
        cellPadding: 5, // Espaciado interno de las celdas
        overflow: 'linebreak', // Manejo de desbordamiento de texto
      },
    });

    // Guardar el PDF
    doc.save('listado_de_modulos.pdf');
  }


  // Manejar la selección de exportación
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

  // Manejar el cambio en el término de búsqueda
  onSearchChange(): void {
    this.filterModulos();
  }

  // Manejar el cambio en el número de ítems por página
  onItemsPerPageChange(): void {
    this.updatePagination();
  }

  // Navegar a la página anterior
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  // Navegar a la página siguiente
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  // Calcular el número total de páginas
  get totalPages(): number {
    return Math.ceil(this.filteredModulos.length / this.itemsPerPage);
  }

  // Obtener los números de página para la navegación
  getPageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  // Navegar a una página específica
  goToPage(page: number): void {
    this.currentPage = page;
  }
}
