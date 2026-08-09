import { translate } from '../i18n';
import type {
  CellValueMap,
  CompareField,
  CompareRecord,
  UiLocale,
} from '../types/compare';
import { EMPTY_CELL_VALUE, makeCellKey } from '../utils/cellFormatting';

interface CompareTableProps {
  locale: UiLocale;
  fields: CompareField[];
  records: CompareRecord[];
  values: CellValueMap;
  loading: boolean;
}

export function CompareTable({
  locale,
  fields,
  records,
  values,
  loading,
}: CompareTableProps) {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  return (
    <section className="compare-table-section" aria-label={t('appTitle')}>
      {loading ? <p className="table-status">{t('tableLoading')}</p> : null}
      <div className="compare-table-scroll">
        <table className="compare-table">
          <thead>
            <tr>
              <th scope="col" className="compare-table__field-header">
                {t('fieldName')}
              </th>
              {records.map((record) => (
                <th scope="col" key={record.id} title={record.title}>
                  {record.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fields.map((field) => (
              <tr key={field.id}>
                <th scope="row" className="compare-table__field-header" title={field.name}>
                  <span>{field.name}</span>
                  {field.isPrimary ? (
                    <small className="field-tag">{t('primaryField')}</small>
                  ) : null}
                </th>
                {records.map((record) => {
                  const value = values[makeCellKey(field.id, record.id)] ?? EMPTY_CELL_VALUE;

                  return (
                    <td key={record.id} title={value}>
                      {value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
