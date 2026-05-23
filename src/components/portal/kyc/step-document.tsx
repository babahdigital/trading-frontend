'use client';

/**
 * KYC Step 2 — Document: type, number, and photo uploads (front, back, selfie).
 */
import { useTranslations } from 'next-intl';
import { FileText, Upload } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Field, Select, UploadField } from './form-fields';
import { DOC_NUMBER_PATTERN } from './types';
import type { StepProps, DocKind, DocUploadState, KycSummary, KycFormData } from './types';

export interface StepDocumentProps extends StepProps {
  docState: Record<DocKind, DocUploadState>;
  summary: KycSummary | null;
  onUploadDoc: (kind: DocKind, file: File) => Promise<void>;
}

export function StepDocument({
  form, onChange, errors, showErrors, locale,
  docState, summary, onUploadDoc,
}: StepDocumentProps) {
  const t = useTranslations('portal.kyc');
  const isEn = locale === 'en';

  return (
    <Card>
      <CardContent className="p-5 space-y-5">
        <h2 className="font-semibold flex items-center gap-2">
          <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" /> {t('section_document')}
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Select
            label={t('field_document_type')}
            value={form.documentType}
            onChange={(v) => onChange({ documentType: v as KycFormData['documentType'], documentNumber: '' })}
            options={[
              { value: 'KTP', label: t('doc_ktp') },
              { value: 'SIM', label: t('doc_sim') },
              { value: 'NPWP', label: t('doc_npwp') },
              { value: 'PASSPORT', label: t('doc_passport') },
              { value: 'NATIONAL_ID', label: isEn ? 'National ID (foreign)' : 'Kartu Identitas Nasional (asing)' },
              { value: 'DRIVER_LICENSE', label: isEn ? 'Driver License (international)' : 'SIM Internasional' },
            ]}
          />
          <Field
            label={t('field_document_number')}
            required
            value={form.documentNumber}
            onChange={(v) => onChange({ documentNumber: v.toUpperCase() })}
            error={showErrors ? errors.documentNumber : undefined}
            hint={isEn ? DOC_NUMBER_PATTERN[form.documentType].hintEn : DOC_NUMBER_PATTERN[form.documentType].hintId}
            mono
          />
        </div>

        {/* Doc photo uploads */}
        <div className="pt-4 mt-2 border-t border-border/60 space-y-4">
          <div>
            <p className="font-medium text-sm flex items-center gap-2 mb-1">
              <Upload className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              {isEn ? 'Document photos' : 'Foto dokumen'}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isEn
                ? 'JPEG, PNG, or WebP. Max 8MB each. All photos are encrypted and only accessible by you and authorized reviewers.'
                : 'JPEG, PNG, atau WebP. Maks 8MB per file. Semua foto disimpan terenkripsi dan hanya dapat diakses Anda dan tim reviewer.'}
            </p>
          </div>

          <UploadField
            kind="front"
            label={isEn ? `${form.documentType} — front side` : `${form.documentType} — sisi depan`}
            hint={isEn ? 'Take a clear photo of the front side. All four corners must be visible.' : 'Foto jelas sisi depan. Pastikan keempat sudut terlihat.'}
            state={docState.front}
            summary={summary}
            onUpload={(file) => onUploadDoc('front', file)}
            showError={showErrors ? errors.docFront : undefined}
            locale={locale}
          />

          {(form.documentType === 'KTP' || form.documentType === 'SIM') && (
            <UploadField
              kind="back"
              label={isEn ? `${form.documentType} — back side` : `${form.documentType} — sisi belakang`}
              hint={isEn ? 'Photo of the back side (NIK / address info).' : 'Foto sisi belakang (NIK / info alamat).'}
              state={docState.back}
              summary={summary}
              onUpload={(file) => onUploadDoc('back', file)}
              showError={showErrors ? errors.docBack : undefined}
              locale={locale}
            />
          )}

          <UploadField
            kind="selfie"
            label={isEn ? 'Selfie holding the document' : 'Selfie sambil memegang dokumen'}
            hint={isEn
              ? 'Hold your document next to your face. Face and document number must both be readable.'
              : 'Pegang dokumen di samping wajah. Wajah dan nomor dokumen harus terbaca.'}
            state={docState.selfie}
            summary={summary}
            onUpload={(file) => onUploadDoc('selfie', file)}
            showError={showErrors ? errors.docSelfie : undefined}
            locale={locale}
          />
        </div>
      </CardContent>
    </Card>
  );
}
