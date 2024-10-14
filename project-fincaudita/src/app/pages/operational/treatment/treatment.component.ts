import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule, NgForm } from '@angular/forms';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { MultiSelectModule } from 'primeng/multiselect';
import { NgSelectModule } from '@ng-select/ng-select';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Lot {
  lot: string; // or appropriate type
}

interface Supply {
  supplie: string; // or appropriate type
  dose: string; // or appropriate type
}

interface Treatment {
  dateTreatment: string; // or appropriate type
  typeTreatment: string; // or appropriate type
  quantityMix: number; // or appropriate type
  lotList: Lot[];
  supplieList: Supply[];
  state: boolean; // assuming true for active, false for inactive
}

@Component({
  selector: 'app-treatment',
  standalone: true,
  imports: [HttpClientModule, FormsModule, CommonModule, MultiSelectModule, NgSelectModule],
  templateUrl: './treatment.component.html',
  styleUrls: ['./treatment.component.css']
})
export class TreatmentComponent implements OnInit {
  treatments: any[] = [];
  treatment: any = {
    id: 0,
    dateTreatment: new Date().toISOString().slice(0, 10),
    typeTreatment: '',
    quantityMix: '',
    state: true,
    lotList: [], // Aquí se asignarán los lotes seleccionados
    supplieList: []
  };
  farms: any[] = [];
  supplies: any[] = [];
  selectedLots: any[] = [];
  selectedSupplies: any[] = [];
  isModalOpen = false;
  isEditing = false;
  filteredTreatment: any[] = [];
  currentPage = 1;
  itemsPerPage = 5;
  searchTerm = '';
  itemsPerPageOptions = [5, 10, 20, 50];
  isDropdownOpen = false;

  private apiUrl = 'http://localhost:9191/api/Treatment';
  private apiUrlFarm = 'http://localhost:9191/api/Farm';
  private apiUrlSupplies = 'http://localhost:9191/api/Supplies';

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) { }

  isDateInCurrentMonth(): boolean {
    if (!this.treatment.dateTreatment) {
      return false; // Si no hay fecha, no es válido
    }

    const selectedDate = new Date(this.treatment.dateTreatment);
    const currentDate = new Date();
    
    return (
      selectedDate.getFullYear() === currentDate.getFullYear() &&
      selectedDate.getMonth() === currentDate.getMonth()
    );

  }  ngOnInit(): void {
    this.getTreatments();
    this.getFarms();
    this.getSupplies();
  }

  getTreatments(): void {
    this.http.get<any[]>(this.apiUrl).subscribe(
      (treatments) => {
        this.treatments = treatments.map(treatment => ({
          ...treatment,
          dateTreatment: new Date(treatment.dateTreatment).toISOString().slice(0, 10)
        }));
        this.filterTreatments();
        console.log('Treatment loaded:', this.treatments);
      },
      (error) => {
        console.error('Error fetching treatments:', error);
      }
    );
  }

  filterTreatments(): void {
    const search = this.searchTerm.toLowerCase().trim();
    this.filteredTreatment = this.treatments.filter((treatment: Treatment) =>
        treatment.dateTreatment.toLowerCase().includes(search) ||
        treatment.typeTreatment.toLowerCase().includes(search) ||
        treatment.quantityMix.toString().includes(search) ||
        treatment.lotList.some((lot: Lot) => lot.lot.toLowerCase().includes(search)) || // Specify the type for lot
        treatment.supplieList.some((supply: Supply) => `${supply.supplie.toLowerCase()} - Dosis: ${supply.dose}`.includes(search)) || // Specify the type for supply
        (treatment.state ? 'activo' : 'inactivo').includes(search)
    );
    this.currentPage = 1; // Reset to the first page
}
paginatedTreatment(): any[] {
  const start = (this.currentPage - 1) * this.itemsPerPage;
  const end = start + this.itemsPerPage;
  return this.filteredTreatment.slice(start, end);
}

exportToExcel(): void {
  const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.filteredTreatment.map(treatment => ({
    Date: treatment.dateTreatment,
    'Type of Treatment': treatment.typeTreatment,
    'Quantity Mix': treatment.quantityMix,
    'Lots': treatment.lotList.map((lot: Lot) => lot.lot).join(', '), // Explicitly define lot type
    'Supplies': treatment.supplieList.map((supply: Supply) => `${supply.supplie} - Dosis: ${supply.dose}`).join(', '), // Explicitly define supply type
    'State': treatment.state ? 'Activo' : 'Inactivo'
  })));

  const workbook: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Tratamientos');
  XLSX.writeFile(workbook, 'Listado de Tratamientos.xlsx');
}

exportToPDF(): void {
  const doc = new jsPDF();
  autoTable(doc, {
    head: [['Fecha de Tratamiento', 'Tipo de Tratamiento', 'Cantidad Mezcla', 'Lotes', 'Suministros', 'Estado']],
    body: this.filteredTreatment.map(treatment => [
      treatment.dateTreatment,
      treatment.typeTreatment,
      treatment.quantityMix,
      treatment.lotList.map((lot: Lot) => lot.lot).join(', '), // Explicitly define lot type
      treatment.supplieList.map((supply: Supply) => `${supply.supplie} - Dosis: ${supply.dose}`).join(', '), // Explicitly define supply type
      treatment.state ? 'Activo' : 'Inactivo'
    ]),
  });
  doc.save('Listado de Tratamientos.pdf');
}
onSearchChange(): void {
  this.filterTreatments();
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
  this.filterTreatments();
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
  return Math.ceil(this.filteredTreatment.length / this.itemsPerPage);
}

getPageNumbers(): number[] {
  return Array.from({ length: this.totalPages }, (_, i) => i + 1);
}

goToPage(page: number): void {
  this.currentPage = page;
}
hasSelected(): boolean {
  return this.filteredTreatment.some(treatment => treatment.selected); // Adjust to check the selected property
}

selectAll(event: any): void {
  const checked = event.target.checked;
  this.treatments.forEach(treatment => (treatment.selected = checked));
}

// Verificar si todos los roles están seleccionados
areAllSelected(): boolean {
  return this.treatments.length > 0 && this.treatments.every(treatment => treatment.selected);
}
deleteSelected(): void {
  const selectedIds = this.filteredTreatment
    .filter(treatment => treatment.selected)
    .map(treatment => treatment.id); // Make sure to use the correct property for ID

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
        const deleteRequests = selectedIds.map(id => this.http.delete(`${this.apiUrl}/treatments/${id}`).toPromise()); // Update URL as necessary

        Promise.all(deleteRequests)
          .then(() => {
            this.filteredTreatment = this.filteredTreatment.filter(treatment => !selectedIds.includes(treatment.id)); // Adjust filtering
            this.filterTreatments(); // Call your filter method for treatments
            Swal.fire('¡Eliminados!', 'Los tratamientos seleccionados han sido eliminados.', 'success');
          })
          .catch((error) => {
            console.error('Error eliminando tratamientos seleccionados:', error);
            Swal.fire('Error', 'Hubo un problema al eliminar los tratamientos seleccionados.', 'error');
          });
      }
    });
  } else {
    Swal.fire('Error', 'No hay tratamientos seleccionados para eliminar.', 'error');
  }
}





  getFarms(): void {
    this.http.get<any[]>(this.apiUrlFarm).subscribe(
      (farms) => {
        this.farms = farms.flatMap(farm => {
          const lots = farm.lots || []; // Asegúrate de que exista el arreglo de lotes
          // Extrae el id de la finca y el cultivo
          return lots.map((lot: { id: number; cultivo: string; }) => ({
            id: lot.id,        // Agrega el id del lote
            cultivo: lot.cultivo, // Extrae el nombre del cultivo
            farmName: farm.name // Extrae el nombre de la finca
          }));
        });
        console.log('Farms loaded:', this.farms);
        this.cdr.detectChanges();
      },
      (error) => {
        console.error('Error fetching farms:', error);
      }
    );
  }

  getSupplies(): void {
    this.http.get<any[]>(this.apiUrlSupplies).subscribe(
      (supplies) => {
        // Traer solo id y nombre
        this.supplies = supplies.map(supply => ({
          id: supply.id,
          name: supply.name
        }));
        console.log('Supplies loaded:', this.supplies);
      },
      (error) => {
        console.error('Error fetching supplies:', error);
      }
    );
  }

    validateForm() {
    for (let supply of this.treatment.supplieList) {
      if (!supply.dose) {
        alert(`Por favor, ingrese la dosis para el insumo ${supply.name}.`);
        return false;
      }
    }
    return true;
  }

  // Agregar insumos seleccionados
  onSuppliesChange(event: any): void {
     // Filtrar los insumos que se han seleccionado pero que no están en la lista de tratamiento
  const newSupplies = event.value.filter((supply: any) =>
    !this.treatment.supplieList.find((item: any) => item.id === supply.id)
  );

  // Agregar los nuevos insumos a la lista de tratamiento
  newSupplies.forEach((supply: any) => {
    this.treatment.supplieList.push({
      id: supply.id,
      name: supply.name,
      dose: ''
    });
  });

  // Remover insumos deseleccionados del MultiSelect
  const removedSupplies = this.treatment.supplieList.filter((supply: any) =>
    !event.value.find((selectedSupply: any) => selectedSupply.id === supply.id)
  );

  // Actualizar la lista de tratamiento eliminando los insumos que ya no están seleccionados
  removedSupplies.forEach((removedSupply: any) => {
    this.treatment.supplieList = this.treatment.supplieList.filter((supply: any) => supply.id !== removedSupply.id);
  });


  this.cdr.detectChanges(); // Actualiza la vista
}

  removeSupplie(id: number): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Este insumo será eliminado de la lista.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminarlo'
    }).then((result) => {
      if (result.isConfirmed) {
        // Elimina el insumo de la lista de seleccionados (supplieList)
        this.treatment.supplieList = this.treatment.supplieList.filter((supply: { id: number; }) => supply.id !== id);
        
        // También elimina el insumo de la lista de seleccionados en el MultiSelect
        this.selectedSupplies = this.selectedSupplies.filter((supply: { id: number; }) => supply.id !== id);
        
        // Detecta los cambios para actualizar la vista
        this.cdr.detectChanges();
        
        Swal.fire('Eliminado', 'El insumo ha sido eliminado.', 'success');
      }
    });
  }
  
  
  openModal(): void {
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isEditing = false;
    this.resetForm();
  }

  onSubmit(form: NgForm): void {

      // Validación: Debe haber al menos un lote y un insumo seleccionado
      if (this.selectedLots.length === 0) {
        Swal.fire('Error', 'Debes seleccionar al menos un lote.', 'error');
        return;
    }
    
    if (this.treatment.supplieList.length === 0) {
        Swal.fire('Error', 'Debes seleccionar al menos un insumo.', 'error');
        return;
    }

    // Validación: Debe ingresarse una dosis para cada insumo
    for (let supply of this.treatment.supplieList) {
        if (!supply.dose || supply.dose.trim() === '') {
            Swal.fire('Error', `Debes ingresar la dosis para el insumo: ${supply.name}.`, 'error');
            return;
        }
    }
    
    const lotList = this.selectedLots.map((lot: any) => {
      return {
        lotId: lot.id, // Solo envía el ID del lote
      };
    });

    const treatmentToSave = {
      ...this.treatment,
      lotList,
      supplieList: this.treatment.supplieList.map((supply: { id: any; dose: any; }) => ({
        suppliesId: supply.id,
        dose: supply.dose
      }))
    };

    console.log('Saving treatment:', treatmentToSave);
    if (this.treatment.id === 0) {
      this.http.post(this.apiUrl, treatmentToSave).subscribe({
        next: () => {
          this.getTreatments();
          this.closeModal();
          Swal.fire('Éxito', '¡Tratamiento creado exitosamente!', 'success');
        },
        error: (error) => {
          console.error('Error al crear tratamiento:', error);
          Swal.fire('Error', 'Hubo un problema al crear el tratamiento.', 'error');
        }
      });
    } else {
      this.http.put(this.apiUrl, treatmentToSave).subscribe({
        next: () => {
          this.getTreatments();
          this.closeModal();
          Swal.fire('Éxito', '¡Tratamiento actualizado correctamente!', 'success');
        },
        error: (error) => {
          console.error('Error al actualizar tratamiento:', error);
          Swal.fire('Error', 'Hubo un problema al actualizar el tratamiento.', 'error');
        }
      });
    }
  }


  editTreatment(treatment: any): void {
    this.treatment = {
      ...treatment,
      dateTreatment: new Date(treatment.dateTreatment).toISOString().slice(0, 10), // Formatea la fecha para el input
      supplieList: treatment.supplieList.map((supplie: any) => ({
        id: supplie.suppliesId, 
        name: this.supplies.find((s: any) => s.id === supplie.suppliesId)?.name || '', // Asigna el nombre basado en el ID
        dose: supplie.dose || ''
      })),
      lotList: treatment.lotList || []  // Asegúrate de incluir la lista de lotes
    };
    
    // Asigna los lotes seleccionados al MultiSelect de lotes
    this.selectedLots = this.farms.filter(farmLot => 
      treatment.lotList.some((lot: any) => lot.lotId === farmLot.id)
    );
  
    // Asigna los insumos seleccionados al MultiSelect de insumos
    this.selectedSupplies = this.supplies.filter(supply => 
      treatment.supplieList.some((supplie: any) => supplie.suppliesId === supply.id)
    );
  
    this.isEditing = true;
    this.openModal();  // Abre el modal para la edición
  }
  

  deleteTreatment(id: number): void {
    Swal.fire({
        title: '¿Estás seguro?',
        text: 'No podrás revertir esto',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, eliminarlo'
    }).then((result) => {
        if (result.isConfirmed) {
            this.http.delete(`${this.apiUrl}/${id}`).subscribe({
                next: () => {
                    this.getTreatments();
                    Swal.fire('Eliminado', 'El tratamiento ha sido eliminado.', 'success');
                },
                error: (error) => {
                    console.error('Error al eliminar tratamiento:', error);
                    Swal.fire('Error', 'Hubo un problema al eliminar el tratamiento.', 'error');
                }
            });
        }
    });
}

  resetForm(): void {
    this.treatment = {
      id: 0,
      dateTreatment: new Date().toISOString().slice(0, 10),
      typeTreatment: '',
      quantityMix: '',
      state: true,
      lotList: [],
      supplieList: []
    };
    this.selectedLots = [];
    this.selectedSupplies = [];
  }
}