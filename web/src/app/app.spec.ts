import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { App } from './app';
import { ProductService } from './services/product-service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        {
          provide: ProductService,
          useValue: {
            getAll: () =>
              of({
                data: [],
                total: 0,
                page: 1,
                limit: 6,
                totalPages: 0,
              }),
          },
        },
      ],
    }).compileComponents();
  });

  it('should render the product inventory heading', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain(
      'A cleaner space for reviewing every imported product.',
    );
  });
});
