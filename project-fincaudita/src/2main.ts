import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { CalendarModule, DateAdapter } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
import { provideHttpClient } from '@angular/common/http';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter([]),
    provideAnimations(),
    provideHttpClient(),
    {
      provide: DateAdapter,
      useFactory: adapterFactory,
    },
    NgbModule,
    ...CalendarModule.forRoot({
      provide: DateAdapter,
      useFactory: adapterFactory,
    }).providers || []
  ],
}).catch((err) => console.error(err));
