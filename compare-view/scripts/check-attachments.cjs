const path = require('path');
const Module = require('module');
const esbuild = require('esbuild');

async function main() {
  const result = await esbuild.build({
    stdin: {
      contents: `
        import assert from 'assert/strict';
        import React from 'react';
        import { renderToStaticMarkup } from 'react-dom/server';
        import { AttachmentPreviewDialog } from './src/components/AttachmentPreviewDialog';
        import { CompareTable } from './src/components/CompareTable';
        import { makeAttachmentCellValue } from './src/utils/cellFormatting';
        import { fieldHasDifference } from './src/utils/compareDiff';

        const field = {
          id: 'fld_attachment',
          name: 'Product files',
          meta: { id: 'fld_attachment', name: 'Product files', type: 17 },
          isPrimary: false,
          kind: 'attachment'
        };
        const images = Array.from({ length: 5 }, (_, index) => ({
          name: \`image-\${index + 1}.png\`,
          mimeType: 'image/png',
          thumbnailUrl: \`https://example.invalid/image-\${index + 1}.png\`
        }));
        const attachmentValue = {
          text: 'image-1.png, image-2.png, image-3.png, image-4.png, image-5.png, failed.png, guide.pdf',
          attachments: [
            ...images,
            { name: 'failed.png', mimeType: 'image/png', thumbnailUrl: null },
            { name: 'guide.pdf', mimeType: 'application/pdf', thumbnailUrl: null }
          ]
        };
        const markup = renderToStaticMarkup(React.createElement(CompareTable, {
          locale: 'en-US',
          fields: [field],
          groups: [{
            key: 'all',
            label: '',
            records: [
              { id: 'rec_with_files', title: 'Product A' },
              { id: 'rec_empty', title: 'Product B' }
            ]
          }],
          collapsedGroupKeys: new Set(),
          differingFieldIds: new Set(['fld_attachment']),
          pendingRecordIds: new Set(),
          values: {
            'fld_attachment::rec_with_files': attachmentValue,
            'fld_attachment::rec_empty': { text: '—', attachments: [] }
          },
          rowHeight: 32,
          loading: false,
          onToggleGroup() {},
          onRemoveRecord() {},
          onMoveRecordBefore() {}
        }));

        assert.equal((markup.match(/<img\\b/g) ?? []).length, 4, 'renders at most four thumbnails');
        assert.ok(
          markup.includes('src="https://example.invalid/image-1.png"'),
          'renders the SDK-provided thumbnail URL'
        );
        assert.match(markup, /alt="image-1\.png"/);
        assert.match(markup, /loading="lazy"/);
        assert.match(markup, />\\+1</, 'reports additional previewable images');
        assert.match(markup, /failed\.png/, 'falls back to a filename when no thumbnail is available');
        assert.match(markup, /guide\.pdf/, 'keeps non-image attachments readable');
        assert.match(markup, />—</, 'keeps empty attachment cells readable');

        const dialogMarkup = renderToStaticMarkup(React.createElement(AttachmentPreviewDialog, {
          locale: 'en-US',
          title: 'Product files',
          images,
          initialIndex: 1,
          onClose() {}
        }));
        assert.match(dialogMarkup, /role="dialog"/);
        assert.match(dialogMarkup, /image-2\.png/, 'opens the selected image');
        assert.match(dialogMarkup, />2 of 5</, 'reports the selected image and gallery size');
        assert.match(dialogMarkup, />Previous</);
        assert.match(dialogMarkup, />Next</);

        const sanitizedValue = makeAttachmentCellValue([{
          name: 'private.png',
          mimeType: 'image/png',
          thumbnailUrl: 'https://example.invalid/private.png',
          token: 'must-not-reach-react'
        }]);
        assert.equal(
          JSON.stringify(sanitizedValue).includes('must-not-reach-react'),
          false,
          'strips SDK-only attachment properties before values reach React'
        );

        const firstValues = {
          'fld_attachment::rec_a': {
            text: 'same.png',
            attachments: [{ name: 'same.png', mimeType: 'image/png', thumbnailUrl: 'https://example.invalid/a' }]
          },
          'fld_attachment::rec_b': {
            text: 'same.png',
            attachments: [{ name: 'same.png', mimeType: 'image/png', thumbnailUrl: 'https://example.invalid/b' }]
          }
        };
        assert.equal(
          fieldHasDifference(firstValues, 'fld_attachment', ['rec_a', 'rec_b']),
          false,
          'temporary thumbnail URLs do not create false differences'
        );
      `,
      resolveDir: path.resolve(__dirname, '..'),
      sourcefile: 'attachment-rendering-check.tsx',
      loader: 'tsx',
    },
    bundle: true,
    platform: 'node',
    format: 'cjs',
    write: false,
    logLevel: 'silent',
  });

  const compiled = result.outputFiles[0].text;
  const checkModule = new Module('attachment-rendering-check', module);
  checkModule.filename = path.join(__dirname, 'attachment-rendering-check.cjs');
  checkModule.paths = module.paths;
  checkModule._compile(compiled, checkModule.filename);
  console.log('Verified attachment cells render image previews with stable difference semantics.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
