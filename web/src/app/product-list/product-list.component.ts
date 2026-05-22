import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { Product } from '../interfaces/product';
import { ProductList } from '../interfaces/product-list';
import { ProductService } from '../services/product-service';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CurrencyPipe, FormsModule],
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductListComponent implements OnInit, OnDestroy {
  private readonly productService = inject(ProductService);
  private toastTimeoutId?: ReturnType<typeof setTimeout>;
  private cdr = inject(ChangeDetectorRef);

  readonly pageSize = 6;
  readonly fallbackImage = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#eef1ef" />
          <stop offset="100%" stop-color="#dce8e0" />
        </linearGradient>
      </defs>
      <rect width="640" height="480" fill="url(#g)" />
      <circle cx="510" cy="114" r="86" fill="#5f7f72" fill-opacity="0.18" />
      <path d="M120 326l86-92 76 70 118-122 120 144H120z" fill="#5f7f72" fill-opacity="0.28" />
      <rect x="140" y="112" width="164" height="32" rx="16" fill="#172026" fill-opacity="0.12" />
      <rect x="140" y="160" width="248" height="20" rx="10" fill="#172026" fill-opacity="0.08" />
    </svg>`,
  )}`;

  products: Product[] = [];
  selectedProduct: Product | null = null;

  page = 1;
  totalPages = 0;
  totalItems = 0;

  isLoading = false;
  isSaving = false;
  isDeleting = false;
  isEditModalOpen = false;
  isDeleteModalOpen = false;
  deleteTargetId: number | null = null;

  toastMessage = '';
  showToast = false;
  fieldErrors: Record<string, string> = {};

  ngOnInit(): void {
    this.loadProducts();
  }

  ngOnDestroy(): void {
    this.clearToastTimer();
  }

  get hasProducts(): boolean {
    return this.products.length > 0;
  }

  get displayTotalPages(): number {
    return Math.max(this.totalPages, 1);
  }

  get pageStart(): number {
    return this.hasProducts ? (this.page - 1) * this.pageSize + 1 : 0;
  }

  get pageEnd(): number {
    return this.hasProducts ? this.pageStart + this.products.length - 1 : 0;
  }

  get canGoToPreviousPage(): boolean {
    return this.page > 1 && !this.isLoading;
  }

  get canGoToNextPage(): boolean {
    return this.page < this.displayTotalPages && !this.isLoading;
  }

  @HostListener('document:keydown.escape')
  handleEscapeKey(): void {
    if (this.isEditModalOpen) {
      this.closeEdit();
      return;
    }

    if (this.isDeleteModalOpen) {
      this.closeDeleteModal();
    }
  }

  loadProducts(targetPage = this.page): void {
    this.page = targetPage;
    this.isLoading = true;

    this.productService.getAll(this.page, this.pageSize).subscribe({
      next: (response: ProductList) => {
        this.products = response.data;
        this.totalPages = response.lastPage;
        this.totalItems = response.total;

        this.isLoading = false;

        if (this.page > this.displayTotalPages) {
          this.loadProducts(this.displayTotalPages);
          return;
        }

        this.cdr.markForCheck(); // 👈 IMPORTANT
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
        this.showToastMessage('Unable to load products.');
      },
    });
  }

  refreshCurrentPage(): void {
    this.loadProducts(this.page);
  }

  nextPage(): void {
    if (this.canGoToNextPage) {
      this.loadProducts(this.page + 1);
    }
  }

  prevPage(): void {
    if (this.canGoToPreviousPage) {
      this.loadProducts(this.page - 1);
    }
  }

  openEdit(product: Product): void {
    this.selectedProduct = { ...product };
    this.fieldErrors = {};
    this.isEditModalOpen = true;
  }

  saveProduct(): void {
    if (!this.selectedProduct || this.isSaving) {
      return;
    }

    const cleanedProduct = {
      ...this.selectedProduct,
      name: this.selectedProduct.name.trim(),
      description: this.selectedProduct.description.trim(),
      imageUrl: this.selectedProduct.imageUrl.trim(),
    };

    if (!cleanedProduct.name || cleanedProduct.price < 0) {
      this.showToastMessage('Please review the product details before saving.');
      return;
    }

    this.isSaving = true;

    this.productService
      .update(cleanedProduct.id, cleanedProduct)
      .pipe(
        finalize(() => {
          this.isSaving = false;
        }),
      )
      .subscribe({
        next: () => {
          this.isEditModalOpen = false;
          this.selectedProduct = null;
          this.loadProducts();
          this.showToastMessage('Product updated successfully.');
        },
        error: (err) => {
          console.error('Error updating product:', err);
          const message =
            err?.error?.message || 'Unable to save product changes.';
          if (err.status === 409) {
            this.fieldErrors['name'] = message; // 👈 attach to field
          } else {
            this.showToastMessage(message);
          }
          this.showToastMessage(message);
        },
      });
  }

  closeEdit(): void {
    if (this.isSaving) {
      return;
    }

    this.isEditModalOpen = false;
    this.selectedProduct = null;
  }

  openDeleteModal(id: number): void {
    this.deleteTargetId = id;
    this.isDeleteModalOpen = true;
  }

  confirmDelete(): void {
    if (this.deleteTargetId === null || this.isDeleting) {
      return;
    }

    this.isDeleting = true;
    const shouldStepBack = this.products.length === 1 && this.page > 1;

    this.productService.delete(this.deleteTargetId).subscribe({
      next: () => {
        this.isDeleting = false;
        this.showToastMessage('Product deleted successfully.');
        this.isDeleteModalOpen = false;
        this.deleteTargetId = null;

        if (shouldStepBack) {
          this.page -= 1;
        }

        this.loadProducts();
      },
      error: () => {
        this.isDeleting = false;
        this.showToastMessage('Unable to delete the product.');
      },
    });
  }

  closeDeleteModal(): void {
    if (this.isDeleting) {
      return;
    }

    this.isDeleteModalOpen = false;
    this.deleteTargetId = null;
  }

  handleImageError(event: Event): void {
    const image = event.target as HTMLImageElement;

    if (image.src !== this.fallbackImage) {
      image.src = this.fallbackImage;
    }
  }

  showToastMessage(message: string): void {
    this.clearToastTimer();

    this.toastMessage = message;
    this.showToast = true;

    this.cdr.markForCheck(); // ✅ force UI update

    this.toastTimeoutId = setTimeout(() => {
      this.showToast = false;
      this.cdr.markForCheck(); // ✅ IMPORTANT
    }, 2500);
  }

  private clearToastTimer(): void {
    if (this.toastTimeoutId) {
      clearTimeout(this.toastTimeoutId);
      this.toastTimeoutId = undefined;
    }
  }
}
