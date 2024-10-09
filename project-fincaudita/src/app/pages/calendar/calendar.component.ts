import { CommonModule } from '@angular/common';
  import { Component, OnInit } from '@angular/core';
  import { HttpClient, HttpClientModule } from '@angular/common/http';
  import { FormsModule } from '@angular/forms';
  import Swal from 'sweetalert2';
import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
import { debounceTime, distinctUntilChanged, map, Observable } from 'rxjs';

  @Component({
    selector: 'app-calendar',
    standalone: true,
    imports: [FormsModule, CommonModule, HttpClientModule, NgbTypeaheadModule],
    templateUrl: './calendar.component.html',
    styleUrls: ['./calendar.component.css']
  })
  export class CalendarComponent implements OnInit {
    month: number = 0;
    year: number = 0;
    users: any[] = [];
    private usersUrl = 'http://localhost:9191/api/User';
    no_of_days: number[] = [];
    blankdays: number[] = [];
    days: string[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    monthNames: string[] = [
      'Enero ', 'Febrero ', 'Marzo ', 'Abril ', 'Mayo ', 'Junio ',
      'Julio ', 'Agosto ', 'Septiembre ', 'Octubre ', 'Noviembre ', 'Diciembre '
    ];

    events: any[] = []; // Datos que provienen del endpoint
    alert = {
      id: 0,
      title: '',
      date: '',
      theme: 'azul',
      userId: null, // Inicializar como null
      state: true
    };

    themes = [
      { value: 'azul', label: 'Azul' },
      { value: 'rojo', label: 'Rojo' },
      { value: 'amarillo', label: 'Amarillo' },
      { value: 'verde', label: 'Verde' },
      { value: 'morado', label: 'Morado' }
    ];

    openEventModal: boolean = false;
    editingEvent: boolean = false;

    constructor(private http: HttpClient) { }

    ngOnInit(): void {
      this.initDate();
      this.getNoOfDays(); 
      this.fetchEvents();
      this.fetchUserId();
      this.getUsers();
    }

    initDate() {
      const today = new Date();
      this.month = today.getMonth();
      this.year = today.getFullYear();
    }

    fetchUserId() {
  this.http.get<any>('http://localhost:9191/api/User')
    .subscribe({
      next: (data) => {
        this.alert.userId = data.id;
        console.log('User ID:', this.alert.userId); // Verifica que el ID se obtenga correctamente
      },
      error: () => {
        Swal.fire('Error', 'No se pudo cargar el usuario', 'error');
      }
    });
}


    isToday(date: number): boolean {
      const today = new Date();
      const d = new Date(this.year, this.month, date);
      return today.toDateString() === d.toDateString();
    }

    getNoOfDays() {
      const daysInMonth = new Date(this.year, this.month + 1, 0).getDate();
      const firstDayOfMonth = new Date(this.year, this.month, 1).getDay();
      const dayOffset = (firstDayOfMonth === 0) ? 6 : firstDayOfMonth - 1;

      this.blankdays = Array(dayOffset).fill(0);
      this.no_of_days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    }

    changeMonth(direction: string) {
      if (direction === 'prev') {
        if (this.month === 0) {
          this.month = 11;
          this.year--;
        } else {
          this.month--;
        }
      } else {
        if (this.month === 11) {
          this.month = 0;
          this.year++;
        } else {
          this.month++;
        }
      }
      this.getNoOfDays();
    }

    showEventModal(date: number) {
      this.alert.date = new Date(this.year, this.month, date).toISOString(); // Cambia a formato ISO
      this.openEventModal = true;
    }

    closeEventModal() {
      this.openEventModal = false;
      this.alert = { id: 0, title: '', date: '', theme: 'azul', userId: null, state: true }; // Reset alert
      this.editingEvent = false;
    }

    fetchEvents() {
      this.http.get<any[]>('http://localhost:9191/api/alert')
        .subscribe({
          next: (data) => {
            this.events = data.map(event => ({
              event_id: event.id,
              event_date: new Date(event.date),
              event_title: event.title,
              event_theme: event.theme.toLowerCase(),
              userId: event.userId // Suponiendo que el evento tiene userId
            }));
          },
          error: (err) => {
            Swal.fire('Error', 'No se pudieron cargar los eventos', 'error');
          }
        });
    }
    


    addEvent() {
      if (!this.alert.userId) {
          Swal.fire('Error', 'Debes estar autenticado para crear un evento', 'error');
          return; 
      }
    
      const alertToSend = {
          id: this.alert.id, // Deja el id como null para nuevos eventos
          title: this.alert.title,
          date: new Date(this.alert.date),
          theme: this.alert.theme.charAt(0).toUpperCase() + this.alert.theme.slice(1),
          userId: this.alert.userId, // Asegúrate de que este valor sea válido
          state: this.alert.state
      };
    
      if (this.alert.id) {
          // Actualizar evento existente
          this.http.put('http://localhost:9191/api/alert', alertToSend)
              .subscribe({
                  next: () => {
                      Swal.fire('Actualizado', 'El evento ha sido actualizado', 'success');
                      this.fetchEvents();
                      this.closeEventModal();
                  },
                  error: () => Swal.fire('Error', 'No se pudo actualizar el evento', 'error')
              });
      } else {
          // Crear nuevo evento
          this.http.post('http://localhost:9191/api/alert', alertToSend)
              .subscribe({
                  next: () => {
                      Swal.fire('Creado', 'El evento ha sido creado', 'success');
                      this.fetchEvents();
                      this.closeEventModal();
                  },
                  error: () => Swal.fire('Error', 'No se pudo crear el evento', 'error')
              });
      }
    }
    

    deleteEvent(event: any) {
      Swal.fire({
        title: '¿Estás seguro?',
        text: 'No podrás recuperar este evento',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, eliminarlo'
      }).then((result) => {
        if (result.isConfirmed) {
          this.http.delete(`http://localhost:9191/api/alert/${event.event_id}`)
    .subscribe({

              next: () => {
                Swal.fire('Eliminado', 'El evento ha sido eliminado', 'success');
                this.fetchEvents();
              },
              error: () => Swal.fire('Error', 'No se pudo eliminar el evento', 'error')
            });
        }
      });
    }

    editEvent(event: any) {
      this.alert = {
        id: event.event_id,
        title: event.event_title,
        date: event.event_date.toDateString(),
        theme: event.event_theme,
        userId: event.userId, 
        state: true
      };
      this.editingEvent = true;
      this.openEventModal = true;
    }

    getEventsForDate(date: number): any[] {
      const targetDate = new Date(this.year, this.month, date).toDateString();
      return this.events.filter(event => new Date(event.event_date).toDateString() === targetDate);
    }

    getUserName(id: number): string {
      const user = this.users.find(u => u.id === id);
      return user ? user.username : 'Desconocido';
    }

    searchUsers = (text$: Observable<string>) =>
      text$.pipe(
        debounceTime(200),
        distinctUntilChanged(),
        map(term => term.length < 1 ? [] : this.users
          .filter(user => user.username.toLowerCase().includes(term.toLowerCase())).slice(0, 10))
      );

    formatUser = (user: any) => user.username;

    onUserSelect(event: any): void {
      const selectedUser = event.item;
      this.alert.userId = selectedUser.id; 
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
  }