import { useEffect, useRef, useState } from 'react';
import { translate } from '../i18n';
import type { CompareCellAttachment, UiLocale } from '../types/compare';

export type PreviewableAttachment = CompareCellAttachment & { thumbnailUrl: string };

interface AttachmentPreviewDialogProps {
  locale: UiLocale;
  title: string;
  images: PreviewableAttachment[];
  initialIndex: number;
  onClose: () => void;
}

function clampIndex(index: number, imageCount: number): number {
  return Math.min(Math.max(index, 0), Math.max(imageCount - 1, 0));
}

/** Read-only gallery for attachment thumbnails issued by the Feishu host. */
export function AttachmentPreviewDialog({
  locale,
  title,
  images,
  initialIndex,
  onClose,
}: AttachmentPreviewDialogProps) {
  const t = (key: Parameters<typeof translate>[1], values?: Record<string, string | number>) =>
    translate(locale, key, values);
  const [currentIndex, setCurrentIndex] = useState(() => clampIndex(initialIndex, images.length));
  const [imageFailed, setImageFailed] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const currentImage = images[currentIndex];
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < images.length - 1;

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    setImageFailed(false);
  }, [currentImage?.thumbnailUrl]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setCurrentIndex((index) => Math.max(index - 1, 0));
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setCurrentIndex((index) => Math.min(index + 1, Math.max(images.length - 1, 0)));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [images.length, onClose]);

  if (!currentImage) {
    return null;
  }

  return (
    <div className="cell-dialog-backdrop" onClick={onClose}>
      <div
        className="attachment-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`${t('attachmentPreview')}: ${currentImage.name}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="cell-dialog__header">
          <span className="cell-dialog__title" title={`${title}: ${currentImage.name}`}>
            {title}: {currentImage.name}
          </span>
          <button
            type="button"
            className="icon-button"
            ref={closeRef}
            aria-label={t('close')}
            onClick={onClose}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <path d="m8 7.1 3.1-3.1.9.9L8.9 8l3.1 3.1-.9.9L8 8.9 4.9 12l-.9-.9L7.1 8 4 4.9l.9-.9L8 7.1Z" />
            </svg>
          </button>
        </div>

        <div className="attachment-dialog__body">
          {imageFailed ? (
            <p className="attachment-dialog__fallback">
              {t('attachmentPreviewUnavailable')}: {currentImage.name}
            </p>
          ) : (
            <img
              key={currentImage.thumbnailUrl}
              src={currentImage.thumbnailUrl}
              alt={currentImage.name}
              decoding="async"
              onError={() => setImageFailed(true)}
            />
          )}
        </div>

        <div className="attachment-dialog__footer">
          <button
            type="button"
            className="secondary-button attachment-dialog__nav"
            disabled={!canGoPrevious}
            aria-label={t('previousImage')}
            onClick={() => setCurrentIndex((index) => Math.max(index - 1, 0))}
          >
            {t('previousImage')}
          </button>
          <span aria-live="polite">
            {t('imageCount', { current: currentIndex + 1, total: images.length })}
          </span>
          <button
            type="button"
            className="secondary-button attachment-dialog__nav"
            disabled={!canGoNext}
            aria-label={t('nextImage')}
            onClick={() => setCurrentIndex((index) => Math.min(index + 1, images.length - 1))}
          >
            {t('nextImage')}
          </button>
        </div>
      </div>
    </div>
  );
}
