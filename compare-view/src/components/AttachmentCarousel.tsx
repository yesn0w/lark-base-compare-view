import { useState } from 'react';
import { translate } from '../i18n';
import type { CompareCellAttachment, CompareCellValue, UiLocale } from '../types/compare';
import { clampImageIndex, imageAttachments } from '../utils/attachmentGallery';

function GalleryImage({ image, label, fallback, onPreview }: {
  image: CompareCellAttachment; label: string; fallback: string; onPreview: () => void;
}) {
  const [failed, setFailed] = useState(false);
  return <div className="attachment-image-stage">
    {failed || !image.thumbnailUrl ? <span className="attachment-image-unavailable">
      {fallback}<span className="attachment-file-name" title={image.name}>{image.name}</span>
    </span> : <button type="button" className="attachment-image-button" onClick={onPreview} aria-label={label}>
      <img src={image.thumbnailUrl} alt={image.name} loading="lazy" decoding="async" onError={() => setFailed(true)} />
    </button>}
  </div>;
}

export function AttachmentCarousel({locale, value, label, index, onIndexChange, onPreview}: {
  locale: UiLocale; value: CompareCellValue; label: string; index: number;
  onIndexChange: (index: number) => void; onPreview: () => void;
}) {
  const t = (key: Parameters<typeof translate>[1], values?: Record<string, string | number>) => translate(locale, key, values);
  const images = imageAttachments(value.attachments);
  const currentIndex = clampImageIndex(index, images.length), current = images[currentIndex];
  const files = value.attachments.filter(file => !file.mimeType.toLowerCase().startsWith('image/'));
  const position = t('imageCount', { current: currentIndex + 1, total: images.length });
  return <div className="attachment-cell">
    {current ? <>
      <GalleryImage key={`${currentIndex}:${current.name}:${current.thumbnailUrl}`} image={current}
        label={`${t('previewAttachment')}: ${label}, ${position}, ${current.name}`} fallback={t('attachmentPreviewUnavailable')} onPreview={onPreview} />
      <span className="attachment-file-name" title={current.name}>{current.name}</span>
      {images.length > 1 ? <div className="attachment-carousel-controls" role="group" aria-label={`${label}: ${position}`} onKeyDown={event => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault(); event.stopPropagation();
          onIndexChange(clampImageIndex(currentIndex + (event.key === 'ArrowLeft' ? -1 : 1), images.length));
        }
      }}>
        <button type="button" className="icon-button" disabled={currentIndex === 0}
          aria-label={`${t('previousImage')}: ${label}, ${position}`} onClick={() => onIndexChange(currentIndex - 1)}>‹</button>
        <span aria-live="polite">{position}</span>
        <button type="button" className="icon-button" disabled={currentIndex === images.length - 1}
          aria-label={`${t('nextImage')}: ${label}, ${position}`} onClick={() => onIndexChange(currentIndex + 1)}>›</button>
      </div> : null}
    </> : null}
    {files.length ? <span className="attachment-file-names" title={files.map(file => file.name).join(', ')}>{files.map(file => file.name).join(', ')}</span> : null}
  </div>;
}
