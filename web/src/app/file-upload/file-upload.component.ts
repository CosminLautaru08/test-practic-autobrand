import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import { finalize } from 'rxjs';
import { API_BASE_URL } from '../core/api.config';

type UploadFeedbackTone = 'success' | 'error';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  templateUrl: './file-upload.component.html',
  styleUrl: './file-upload.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileUploadComponent implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly uploadUrl = `${API_BASE_URL}/invoice/upload`;
  private toastTimeoutId?: ReturnType<typeof setTimeout>;

  @ViewChild('fileInput') private fileInput?: ElementRef<HTMLInputElement>;

  public selectedFile: File | null = null;
  public isUploading = false;
  public showToast = false;
  public toastMessage = '';
  public toastTone: UploadFeedbackTone = 'success';

  public ngOnDestroy(): void {
    this.clearToastTimer();
  }

  public onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    this.clearFeedback();

    if (!file) {
      this.selectedFile = null;
      this.cdr.markForCheck();
      return;
    }

    if (!this.isPdfFile(file)) {
      this.resetSelection();
      this.showFeedback('Select a PDF invoice before uploading.', 'error');
      return;
    }

    this.selectedFile = file;
    this.cdr.markForCheck();
  }

  public uploadInvoice(): void {
    if (!this.selectedFile || this.isUploading) {
      return;
    }

    const formData = new FormData();
    formData.append('file', this.selectedFile);

    this.isUploading = true;
    this.clearFeedback();
    this.cdr.markForCheck();

    this.http
      .post(this.uploadUrl, formData, { responseType: 'blob' })
      .pipe(
        finalize(() => {
          this.isUploading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (csvFile) => {
          try {
            this.downloadCsv(csvFile);
            this.resetSelection();
            this.showFeedback(
              'Invoice processed. CSV download started as invoice.csv.',
              'success',
            );
          } catch (error) {
            console.error('Unable to start CSV download:', error);
            this.handleUploadFailure(
              'Invoice processed, but the CSV download could not be started.',
            );
          }
        },
        error: async (error: HttpErrorResponse) => {
          console.error('Invoice upload failed:', error);
          this.handleUploadFailure(
            await this.getFriendlyUploadErrorMessage(error),
          );
        },
      });
  }

  private downloadCsv(csvFile: Blob): void {
    const downloadUrl = window.URL.createObjectURL(csvFile);
    const link = document.createElement('a');

    link.href = downloadUrl;
    link.download = 'invoice.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.URL.revokeObjectURL(downloadUrl);
  }

  private isPdfFile(file: File): boolean {
    return (
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf')
    );
  }

  private handleUploadFailure(message: string): void {
    this.resetSelection();
    this.showFeedback(message, 'error');
  }

  private resetSelection(): void {
    this.selectedFile = null;
    this.resetFileInput();
    this.cdr.markForCheck();
  }

  private showFeedback(message: string, tone: UploadFeedbackTone): void {
    this.clearToastTimer();
    this.toastMessage = message;
    this.toastTone = tone;
    this.showToast = true;
    this.cdr.markForCheck();

    this.toastTimeoutId = setTimeout(() => {
      this.showToast = false;
      this.cdr.markForCheck();
    }, 3000);
  }

  private clearFeedback(): void {
    this.clearToastTimer();
    this.showToast = false;
    this.toastMessage = '';
    this.toastTone = 'success';
  }

  private clearToastTimer(): void {
    if (this.toastTimeoutId) {
      clearTimeout(this.toastTimeoutId);
      this.toastTimeoutId = undefined;
    }
  }

  private async getFriendlyUploadErrorMessage(
    error: HttpErrorResponse,
  ): Promise<string> {
    const details = await this.extractErrorDetails(error);

    if (error.status === 0) {
      return 'The upload server could not be reached. Check that the API is running and try again.';
    }

    if (error.status === 400) {
      return 'The uploaded file could not be read as a valid PDF invoice.';
    }

    if (error.status === 413) {
      return 'The PDF invoice is too large. Upload a smaller file and try again.';
    }

    if (error.status === 415) {
      return 'Only PDF invoice files are supported.';
    }

    if (error.status === 422) {
      return 'The invoice was uploaded, but no product rows could be extracted from it.';
    }

    if (details?.includes('only pdf')) {
      return 'Only PDF invoice files are supported.';
    }

    if (
      details?.includes('could not be read') ||
      details?.includes('invalid pdf')
    ) {
      return 'The uploaded file could not be read as a valid PDF invoice.';
    }

    if (
      details?.includes('no product rows') ||
      details?.includes('no invoice line')
    ) {
      return 'The invoice was uploaded, but no product rows could be extracted from it.';
    }

    return 'The invoice could not be processed right now. Please try again.';
  }

  private async extractErrorDetails(
    error: HttpErrorResponse,
  ): Promise<string | null> {
    const directMessage = this.extractMessageFromPayload(error.error);
    if (directMessage) {
      return directMessage.toLowerCase();
    }

    if (error.error instanceof Blob) {
      try {
        const blobMessage = this.extractMessageFromPayload(
          await error.error.text(),
        );
        return blobMessage ? blobMessage.toLowerCase() : null;
      } catch {
        return null;
      }
    }

    const fallbackMessage = this.extractMessageFromPayload(error.message);
    return fallbackMessage ? fallbackMessage.toLowerCase() : null;
  }

  private extractMessageFromPayload(payload: unknown): string | null {
    if (!payload) {
      return null;
    }

    if (typeof payload === 'string') {
      const text = payload.trim();

      if (!text || /^<!doctype|^<html/i.test(text)) {
        return null;
      }

      if (/^[[{]/.test(text)) {
        try {
          return this.extractMessageFromPayload(JSON.parse(text));
        } catch {
          return text;
        }
      }

      return text;
    }

    if (typeof payload === 'object') {
      const record = payload as {
        message?: unknown;
        error?: unknown;
      };

      if (Array.isArray(record.message)) {
        const messages = record.message
          .filter((message): message is string => typeof message === 'string')
          .map((message) => message.trim())
          .filter(Boolean);

        if (messages.length > 0) {
          return messages.join(', ');
        }
      }

      if (typeof record.message === 'string' && record.message.trim()) {
        return record.message.trim();
      }

      if (typeof record.error === 'string' && record.error.trim()) {
        return record.error.trim();
      }
    }

    return null;
  }

  private resetFileInput(): void {
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }
}
