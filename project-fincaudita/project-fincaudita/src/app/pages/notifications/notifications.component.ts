import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css']
})
export class NotificationsComponent {
  notifications = [
    { message: 'Tienes un nuevo mensaje de @usuario1', date: new Date(), read: false },
    { message: 'Tu evento "Reunión" empieza en 30 minutos', date: new Date(), read: false },
    { message: 'Has recibido una nueva invitación de @usuario2', date: new Date(), read: true }
  ];

  // Método para marcar una notificación como leída
  markAsRead(notification: any) {
    notification.read = true;
  }
}
