import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { NgSelectModule } from '@ng-select/ng-select';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
@Component({
  selector: 'app-lot',
  standalone: true,
  imports: [HttpClientModule, FormsModule, CommonModule, NgbTypeaheadModule,NgSelectModule],
  templateUrl: './lot.component.html',
  styleUrls: ['./lot.component.css']
})
export class LotComponent implements OnInit {
  lots: any[] = [];
  lot: any = { id: 0, cropId: 0, farmId: 0, num_hectareas: 0, state: true };
  farms: any[] = [];
  crops: any[] = [];
  isModalOpen = false;
  filteredLot: any[] = [];
  currentPage = 1;
  itemsPerPage = 5;
  searchTerm = '';
  itemsPerPageOptions = [5, 10, 20, 50];
  isDropdownOpen = false;

  private apiUrl = 'http://localhost:9191/api/lot';
  private farmsUrl = 'http://localhost:9191/api/Farm';
  private cropsUrl = 'http://localhost:9191/api/crop';

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  searchFarms = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      map(term => term.length < 1 ? []
        : this.farms.filter(farm => farm.name.toLowerCase().includes(term.toLowerCase())).slice(0, 10))
    );

  formatFarm = (farm: any) => farm.name;

  onFarmSelect(event: any): void {
    const selectedFarm = event.item;
    this.lot.farmId = selectedFarm.id;
    this.cdr.detectChanges(); // Forzar la actualización del componente
  }

  searchCrops = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      map(term => term.length < 1 ? []
        : this.crops.filter(crop => crop.name.toLowerCase().includes(term.toLowerCase())).slice(0, 10))
    );

  formatCrop = (crop: any) => crop.name;

  onCropSelect(event: any): void {
    const selectedCrop = event.item;
    this.lot.cropId = selectedCrop.id;
    this.cdr.detectChanges(); // Forzar la actualización del componente
  }

  ngOnInit(): void {
    this.getLots();
    this.getFarms();
    this.getCrops();
  }

  getLots(): void {
    this.http.get<any[]>(this.apiUrl).subscribe(
      (lots) => {
        this.lots = lots;
        this.filterLots();
        this.cdr.detectChanges();
      },
      (error) => {
        console.error('Error fetching lots:', error);
      }
    );
  }

  filterLots(): void {
    const search = this.searchTerm.toLowerCase().trim();
    this.filteredLot = this.lots.filter(lot =>
      this.getCropName(lot.cropId)?.toLowerCase().includes(search) || // Filter by crop name
      this.getFarmName(lot.farmId)?.toLowerCase().includes(search) || // Filter by farm name
      lot.num_hectareas.toString().includes(search) || // Filter by number of hectares
      (lot.state ? 'activo' : 'inactivo').includes(search) // Filter by lot state
    );
    this.currentPage = 1; // Reset to the first page
  }
  
  paginatedLot(): any[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredLot.slice(start, end);
  }

  exportToExcel(): void {
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.filteredLot.map(lot => ({
        ID: lot.id,
        Cultivo: this.getCropName(lot.cropId),
        Finca: this.getFarmName(lot.farmId),
        'Número de Hectáreas': lot.num_hectareas,
        Estado: lot.state ? 'Activo' : 'Inactivo'
    })));

    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Lotes');
    XLSX.writeFile(workbook, 'Listado de Lotesxlsx');
}

exportToPDF(): void {
  const doc = new jsPDF();
  autoTable(doc, {
      head: [['ID', 'Cultivo', 'Finca', 'Número de Hectáreas', 'Estado']],
      body: this.filteredLot.map(lot => [
          lot.id,
          this.getCropName(lot.cropId),
          this.getFarmName(lot.farmId),
          lot.num_hectareas,
          lot.state ? 'Activo' : 'Inactivo'
      ]),
  });
  doc.save('Listado de Lotes.pdf');
}
onSearchChange(): void {
  this.filterLots();
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
  this.filterLots();
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
  return Math.ceil(this.filteredLot.length / this.itemsPerPage);
}

getPageNumbers(): number[] {
  return Array.from({ length: this.totalPages }, (_, i) => i + 1);
}

goToPage(page: number): void {
  this.currentPage = page;
}
hasSelected(): boolean {
  return this.lots.some(lot => lot.selected);
}
selectAll(event: any): void {
  const checked = event.target.checked;
  this.lots.forEach(lot => (lot.selected = checked));
}

// Verificar si todos los roles están seleccionados
areAllSelected(): boolean {
  return this.lots.length > 0 && this.lots.every(lot => lot.selected);
}
deleteSelected(): void {
  const selectedIds = this.lots.filter(lot => lot.selected).map(lot => lot.id); // Assuming 'id' is the identifier for lots

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
            this.lots = this.lots.filter(lot => !selectedIds.includes(lot.id)); // Update the list of lots after deletion
            this.filterLots(); // You should have a filter method similar to users
            Swal.fire('¡Eliminados!', 'Los lotes seleccionados han sido eliminados.', 'success');
          })
          .catch((error) => {
            console.error('Error eliminando lotes seleccionados:', error);
            Swal.fire('Error', 'Hubo un problema al eliminar los lotes seleccionados.', 'error');
          });
      }
    });
  } else {
    Swal.fire('Error', 'No hay lotes seleccionados para eliminar.', 'error');
  }
}



  getFarms(): void {
    this.http.get<any[]>(this.farmsUrl).subscribe(
      (farms) => {
        this.farms = farms;
      },
      (error) => {
        console.error('Error fetching farms:', error);
      }
    );
  }

  getCrops(): void {
    this.http.get<any[]>(this.cropsUrl).subscribe(
      (crops) => {
        this.crops = crops;
      },
      (error) => {
        console.error('Error fetching crops:', error);
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
    if (!this.lot.cropId || !this.lot.farmId) {
      Swal.fire('Error', 'Debe seleccionar un cultivo y una finca válidos.', 'error');
      return;
    }
  
    this.lot.num_hectareas = +this.lot.num_hectareas; // Convertir num_hectareas a número entero
  
    if (this.lot.id === 0) {
      this.http.post(this.apiUrl, this.lot).subscribe({
        next: () => {
          this.getLots();
          this.closeModal();
          Swal.fire('Éxito', 'Lote creado exitosamente!', 'success');
        },
        error: (err) => {
          console.error('Error creating lot:', err);
          Swal.fire('Error', 'Error al crear el lote.', 'error');
        }
      });
    } else {
      this.http.put(this.apiUrl, this.lot).subscribe({
        next: () => {
          this.getLots();
          this.closeModal();
          Swal.fire('Éxito', 'Lote actualizado exitosamente!', 'success');
        },
        error: (err) => {
          console.error('Error updating lot:', err);
          Swal.fire('Error', 'Error al actualizar el lote.', 'error');
        }
      });
    }
  }

  editLot(lot: any): void {
    this.lot = { ...lot };
    this.openModal();
  }

  deleteLot(id: number): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: '¡No podrás revertir esto!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, ¡elimínalo!',
      cancelButtonText: 'No, cancelar',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.http.delete(`${this.apiUrl}/${id}`).subscribe(() => {
          this.getLots();
          Swal.fire('¡Eliminado!', 'El lote ha sido eliminado.', 'success');
        });
      }
    });
  }

  resetForm(): void {
    this.lot = { id: 0, cropId: 0, farmId: 0, num_hectareas: 0, state: true };
  }

  getFarmName(farmId: number): string {
    const farm = this.farms.find(f => f.id === farmId);
    return farm ? farm.name : 'Desconocido';
  }

  getCropName(cropId: number): string {
    const crop = this.crops.find(c => c.id === cropId);
    return crop ? crop.name : 'Desconocido';
  }
}
