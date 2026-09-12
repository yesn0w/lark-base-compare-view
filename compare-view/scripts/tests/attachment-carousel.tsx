import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AttachmentCarousel } from '../../src/components/AttachmentCarousel';
import { AttachmentPreviewDialog } from '../../src/components/AttachmentPreviewDialog';
import { imageAttachments, imageIndex, attachmentSignature, retainImagePositions, type ImagePositions } from '../../src/utils/attachmentGallery';
import { makeAttachmentCellValue } from '../../src/utils/cellFormatting';

export function check() {
  const attachments = [
    {name:'wide.png',mimeType:'image/png',thumbnailUrl:'https://example.invalid/wide'},
    {name:'manual.pdf',mimeType:'application/pdf',thumbnailUrl:null},
    {name:'missing.jpg',mimeType:'image/jpeg',thumbnailUrl:null},
    {name:'tall.png',mimeType:'image/png',thumbnailUrl:'https://example.invalid/tall'},
  ];
  const images = imageAttachments(attachments), value = makeAttachmentCellValue(attachments);
  assert.deepEqual(images.map(image=>image.name), ['wide.png','missing.jpg','tall.png']);
  for (const locale of ['zh-CN','en-US'] as const) for (const index of [0,1,2]) {
    const markup = renderToStaticMarkup(<AttachmentCarousel locale={locale} label="Field: Record" value={value} index={index} onIndexChange={()=>{}} onPreview={()=>{}} />);
    assert.equal((markup.match(/<img /g) ?? []).length, index === 1 ? 0 : 1);
    assert.match(markup, /attachment-image-stage/); assert.match(markup, /manual.pdf/);
    assert.match(markup, new RegExp(images[index].name.replace('.', '\\.')));
    assert.equal((markup.match(/disabled=""/g) ?? []).length, index === 1 ? 0 : 1);
    const dialog = renderToStaticMarkup(<AttachmentPreviewDialog locale={locale} title="Field: Record" images={images} currentIndex={index} onIndexChange={()=>{}} onClose={()=>{}} />);
    assert.equal((dialog.match(/<img /g) ?? []).length, index === 1 ? 0 : 1);
    assert.match(dialog, /role="dialog"/);
  }
  const single = renderToStaticMarkup(<AttachmentCarousel locale="en-US" label="Single" value={makeAttachmentCellValue([attachments[0]])} index={0} onIndexChange={()=>{}} onPreview={()=>{}} />);
  assert.doesNotMatch(single, /carousel-controls/);
  const files = renderToStaticMarkup(<AttachmentCarousel locale="en-US" label="Files" value={makeAttachmentCellValue([attachments[1]])} index={0} onIndexChange={()=>{}} onPreview={()=>{}} />);
  assert.doesNotMatch(files, /image-stage/);
  const positions: ImagePositions = {'f::r': {signature:attachmentSignature(attachments), index:2}};
  assert.equal(imageIndex(positions, 'f::r', attachments), 2);
  assert.equal(imageIndex(positions, 'f::r', attachments.slice(0,1)), 0);
  assert.equal(retainImagePositions(positions, ['f'], ['r'], {'f::r':value}), positions);
  assert.deepEqual(retainImagePositions(positions, [], ['r'], {}), {});
  assert.deepEqual(retainImagePositions(positions, ['f'], [], {}), {});
  assert.deepEqual(retainImagePositions(positions, ['f'], ['r'], {'f::r':makeAttachmentCellValue([])}), {});
  assert.equal(retainImagePositions(positions, ['f'], ['r'], {}), positions, 'loading placeholders do not lose reading position');
}
