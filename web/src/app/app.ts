import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ProductListComponent } from './product-list/product-list.component';

@Component({
  imports: [RouterModule, ProductListComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected title = 'web';
}
