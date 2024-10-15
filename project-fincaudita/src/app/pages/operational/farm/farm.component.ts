import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { MultiSelectModule } from 'primeng/multiselect';
import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';
import { Lot } from './interface-lots';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

export interface Farm {
  id: number;
  name: string;
  cityId: number;
  userId: number;
  lots: Lot[];
  addres: string;
  dimension: number;
  state: boolean;
}
@Component({
  selector: 'app-farm',
  standalone: true,
  imports: [HttpClientModule, FormsModule, CommonModule, NgbTypeaheadModule, MultiSelectModule, NgSelectModule, MatInputModule,
    MatAutocompleteModule],
  templateUrl: './farm.component.html',
  styleUrls: ['./farm.component.css']
})
export class FarmComponent implements OnInit {

  farms: any[] = [];
  farm: any = { id: 0, name: '', cityId: 0, userId: 0, lots: [], addres: '', dimension: '', state: true };
  cities: any[] = [];
  users: any[] = [];
  crops: any[] = [];
  selectedCropId: any[] = [];
  hectares: number | null = null;
  isModalOpen = false;
  filteredFarms: any[] = [];
  filteredCitys: any[] = [];
  filteredUsers: any[] = [];
  currentPage = 1;
  itemsPerPage = 5;
  searchTerm = '';
  itemsPerPageOptions = [5, 10, 20, 50];
  isDropdownOpen = false;
  userRoleID: number = 0; 

  private apiUrl = 'http://localhost:9191/api/Farm';
  private citiesUrl = 'http://localhost:9191/api/City';
  private usersUrl = 'http://localhost:9191/api/User';
  private cropsUrl = 'http://localhost:9191/api/Crop';

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) { }

  onlyPositiveNumbers(event: KeyboardEvent) {
    // Permitir solo números (0-9) y el punto (.) si es necesario
    const char = String.fromCharCode(event.keyCode);
    if (!/[0-9]/.test(char)) {
      event.preventDefault(); // Previene la entrada si no es válida
    }
  } 
  ngOnInit(): void {
    this.getUserRole();
    console.log('User Role ID:', this.userRoleID);
    this.getFarms();
    this.getCities();
    this.getUsers();
    this.getCrops();
  }

  getUserRole(): void {
    const user = JSON.parse(localStorage.getItem('menu') || '{}');
    if (user && user.menu && user.menu.length > 0) {
      this.userRoleID = user.menu[0].roleID; // Accediendo correctamente a roleID
      console.log('User Role ID from localStorage:', this.userRoleID); // Para depuración
    }
  }

  searchCitys(event: any): void {
    const term = event.target.value.toLowerCase();
    this.filteredCitys = this.cities.filter(city =>
      city.name.toLowerCase().includes(term)
    );
  }

  onCitySelect(event: any): void {
    const selectedcity = this.cities.find(city =>
      city.name === event.option.value
    );
    if (selectedcity) {
      this.farm.cityId = selectedcity.id;
      this.farm.cityName = selectedcity.name;
      this.filteredCitys = [];
    }
  }

  getCityName(id: number): string {
    const city = this.cities.find(c => c.id === id);
    return city ? city.name : 'Desconocido';
  }

  searchUsers(event: any): void {
    const term = event.target.value.toLowerCase();
    this.filteredUsers = this.users.filter(user =>
      user.username.toLowerCase().includes(term)
    );
  }

  onUserSelect(event: any): void {
    const selecteduser = this.users.find(user =>
      user.username === event.option.value
    );
    if (selecteduser) {
      this.farm.userId = selecteduser.id;
      this.farm.userUsername = selecteduser.username;
      this.filteredUsers = [];
    }
  }

  getUserName(id: number): string {
    const user = this.users.find(u => u.id === id);
    return user ? user.username : 'Desconocido';
  }

  getFarms(): void {
    this.http.get<any[]>(this.apiUrl).subscribe(
      (farms) => {
        this.farms = farms;
        this.filterFarms();
        console.log('Farms loaded:', this.farms);
        this.cdr.detectChanges();
      },
      (error) => {
        console.error('Error fetching farms:', error);
      }
    );
  }

  filterFarms(): void {
    const search = this.searchTerm.toLowerCase().trim();
    this.filteredFarms = this.farms.filter((farm: Farm) =>
      farm.name.toLowerCase().includes(search) ||
      farm.addres.toLowerCase().includes(search) ||
      this.getCityName(farm.cityId)?.toLowerCase().includes(search) ||
      this.getUserName(farm.userId)?.toLowerCase().includes(search) ||
      farm.dimension.toString().includes(search) ||
      farm.lots.some((lot: Lot) =>
        lot.cultivo.toLowerCase().includes(search) ||
        lot.num_hectareas.toString().includes(search)
      )
    );
    this.currentPage = 1;
  }
  paginatedFarm(): any[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredFarms.slice(start, end);
  }
  exportToExcel(): void {
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.filteredFarms.map(farm => ({
      ID: farm.id,
      Nombre: farm.name,
      Dirección: farm.addres,
      Ciudad: this.getCityName(farm.cityId),
      Usuario: this.getUserName(farm.userId),
      Dimensión: farm.dimension,
      Estado: farm.state ? 'Activo' : 'Inactivo',
      Lotes: `"${farm.lots.map((lot: Lot) => `${lot.cultivo} - Núm-hectareas: ${lot.num_hectareas}`).join(', ')}"`
    })));

    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Fincas');
    XLSX.writeFile(workbook, 'listado_de_fincas.xlsx');
  }


  exportToPDF(): void {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [['ID', 'Nombre', 'Dirección', 'Ciudad', 'Usuario', 'Dimensión', 'Estado', 'Lotes']],
      body: this.filteredFarms.map(farm => [
        farm.id,
        farm.name,
        farm.addres,
        this.getCityName(farm.cityId),
        this.getUserName(farm.userId),
        farm.dimension,
        farm.state ? 'Activo' : 'Inactivo',
        farm.lots.map((lot: Lot) => `${lot.cultivo} - N m-hect reas: ${lot.num_hectareas}`).join(', ')
      ]),
    });
    doc.save('listado_de_fincas.pdf');
  }
  onSearchChange(): void {
    this.filterFarms();
  }

  handleExport(event: any): void {
    const value = event;

    if (value === 'pdf') {
      this.exportToPDF();
    } else if (value === 'excel') {
      this.exportToExcel();
    }

    this.searchTerm = '';
  }

  updatePagination(): void {
    this.currentPage = 1;
    this.filterFarms();
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
    return Math.ceil(this.filteredFarms.length / this.itemsPerPage);
  }

  getPageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  goToPage(page: number): void {
    this.currentPage = page;
  }

  hasSelected(): boolean {
    return this.farms.some(farm => farm.selected);
  }
  selectAll(event: any): void {
    const checked = event.target.checked;
    this.farms.forEach(farm => (farm.selected = checked));
  }

  // Verificar si todos los roles están seleccionados
  areAllSelected(): boolean {
    return this.farms.length > 0 && this.farms.every(farm => farm.selected);
  }
  deleteSelected(): void {
    const selectedIds = this.farms.filter(farm => farm.selected).map(farm => farm.id);

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
              this.farms = this.farms.filter(farm => !selectedIds.includes(farm.id));
              this.filterFarms();
              Swal.fire('¡Eliminados!', 'Las fincas seleccionadas han sido eliminadas.', 'success');
            })
            .catch((error) => {
              console.error('Error eliminando fincas seleccionadas:', error);
              Swal.fire('Error', 'Hubo un problema al eliminar las fincas seleccionadas.', 'error');
            });
        }
      });
    } else {
      Swal.fire('Error', 'No hay fincas seleccionadas para eliminar.', 'error');
    }
  }

  getCities(): void {
    this.http.get<any[]>(this.citiesUrl).subscribe(
      (cities) => {
        this.cities = cities;
      },
      (error) => {
        console.error('Error fetching cities:', error);
      }
    );
  }

  getUsers(): void {
    this.http.get<any[]>(this.usersUrl).subscribe(
      (users) => {
        this.users = users;
      },
      (error) => {
        console.error('Error fetching users:', error);
      }
    );
  }

  getCrops(): void {
    this.http.get<any[]>(this.cropsUrl).subscribe(
      (crops) => {
        this.crops = crops.map(cropp => ({
          id: cropp.id,
          name: cropp.name

        }));
      },
      (error) => {
        console.error('Error fetching crops:', error);
      }
    );
  }

  validateForm() {
    for (let cropp of this.farm.lots) {
      if (!cropp.num_hectareas) {
        alert("Por favor, ingrese la dosis para el insumo \"" + cropp.name + "\".");
        return false;
      }
    }
    return true;
  }

  openModal(): void {
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.resetForm();
  }

  // Agregar lotes seleccionados
  onFarmChange(event: any): void {
    const newCrops = event.value.filter((cropp: any) =>
      !this.farm.lots.find((lot: any) => lot.id === cropp.id)
    );

    newCrops.forEach((cropp: any) => {
      this.farm.lots.push({
        id: cropp.id,
        name: cropp.name,
        num_hectareas: 0
      });
    });

    // Remover lotes deseleccionados del MultiSelect
    const removedLots = this.farm.lots.filter((cropp: any) =>
      !event.value.find((selectedLot: any) => selectedLot.id === cropp.id)
    );

    removedLots.forEach((removedLot: any) => {
      this.farm.lots = this.farm.lots.filter((cropp: any) => cropp.id !== removedLot.id);
      this.selectedCropId = this.selectedCropId.filter((crop: any) => crop.id !== removedLot.id);
    });
    console.log('lots:', this.farm.lots);
    this.cdr.detectChanges();
  }

  removeLot(id: number): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Este cultivo será eliminado de la lista.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminarlo'
    }).then((result) => {
      if (result.isConfirmed) {
        this.farm.lots = this.farm.lots.filter((cropp: { id: number; }) => cropp.id !== id);
        this.selectedCropId = this.selectedCropId.filter((cropp: { id: number; }) => cropp.id !== id);

        if (this.farm.lots.length === 0) {
        }
        this.cdr.detectChanges();

        Swal.fire('Eliminado', 'El cultivo ha sido eliminado.', 'success');
      }
    });
  }



  onSubmit(form: NgForm): void {
    if (!this.farm.cityId || !this.farm.userId) {

      Swal.fire('Error', 'Debe seleccionar una ciudad y un usuario válidos.', 'error');
      return;
    }

    if (!this.farm.lots || this.farm.lots.length === 0) {
      Swal.fire('Error', 'Debe agregar al menos un lote válido.', 'error');
      return;
    }

    const lotss = this.selectedCropId.map((crop: any) => {
      return {
        CropId: crop.id, // Solo envía el ID del lote
      };
    });

    const farmToSave = {
      ...this.farm,
      lots: this.farm.lots.map((lot: { id: { id: any; }; num_hectareas: any; }) => ({
        cropId: lot.id, // Asegúrate de que cropId tenga el ID correcto
        num_hectareas: lot.num_hectareas
      }))
    };

    console.log("Save Farm", farmToSave)
    if (this.farm.id === 0) {
      this.http.post(this.apiUrl, farmToSave).subscribe({
        next: () => {
          this.getFarms();
          this.closeModal();
          Swal.fire('Éxito', '¡Finca creada exitosamente!', 'success');
        },
        error: (error) => {
          console.error('Error al crear finca:', error);
          Swal.fire('Error', 'Hubo un problema al crear la finca.', 'error');
        }
      });
    } else {
      this.http.put(this.apiUrl, farmToSave).subscribe({
        next: () => {
          this.getFarms();
          this.closeModal();
          Swal.fire('Éxito', '¡Finca actualizada correctamente!', 'success');
        },
        error: (error) => {
          console.error('Error al actualizar finca:', error);
          Swal.fire('Error', 'Hubo un problema al actualizar la finca.', 'error');
        }
      });
    }
  }

  editFarm(farm: any): void {
    this.farm = { ...farm };
    this.farm.lots = farm.lots.map((lot: any) => ({
      id: lot.cropId,
      name: this.crops.find((crop: any) => crop.id === lot.cropId)?.name || 'Desconocido',
      num_hectareas: lot.num_hectareas
    }));

    const selectedCity = this.cities.find(cit => cit.id === this.farm.cityId);
    if (selectedCity) {
      this.farm.cityName = selectedCity.name;
    }

    const selectedUser = this.users.find(use => use.id === this.farm.userId);
    if (selectedUser) {
      this.farm.userUsername = selectedUser.username;
    }
    this.selectedCropId = this.farm.lots.map((lot: { id: any; name: any; }) => ({
      id: lot.id,
      name: lot.name
    }));

    this.openModal();
  }

  deleteFarm(id: number): void {
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
          this.getFarms();
          Swal.fire('¡Eliminado!', 'La finca ha sido eliminada.', 'success');
        });
      }
    });
  }

  resetForm(): void {
    this.farm = { id: 0, name: '', cityId: 0, userId: 0, lots: [], addres: '', dimension: 0, state: false };
    this.selectedCropId = [];
  }
}