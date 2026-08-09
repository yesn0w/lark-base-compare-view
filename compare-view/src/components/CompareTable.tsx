import { translate } from '../i18n';
import type {
  CellValueMap,
  CompareField,
  CompareRecordGroup,
  UiLocale,
} from '../types/compare';
import { EMPTY_CELL_VALUE, makeCellKey } from '../utils/cellFormatting';

interface CompareTableProps {
  locale: UiLocale;
  fields: CompareField[];
  groups: CompareRecordGroup[];
  collapsedGroupKeys: Set<string>;
  values: CellValueMap;
  loading: boolean;
  onToggleGroup: (groupKey: string) => void;
}

export function CompareTable({
  locale,
  fields,
  groups,
  collapsedGroupKeys,
  values,
  loading,
  onToggleGroup,
}: CompareTableProps) {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const grouped = groups.some((group) => Boolean(group.label));
  const visibleGroups = groups.filter((group) => !collapsedGroupKeys.has(group.key));
  const records = visibleGroups.flatMap((group) => group.records);

  const groupControls = grouped ? (
    <div className="table-group-controls" aria-label={t('groupedRecords')}>
      {groups.map((group) => {
        const collapsed = collapsedGroupKeys.has(group.key);
        return (
          <button
            type="button"
            className={`table-group-toggle${collapsed ? ' table-group-toggle--collapsed' : ''}`}
            key={group.key}
            aria-pressed={!collapsed}
            onClick={() => onToggleGroup(group.key)}
          >
            <span>{group.label}</span>
            <small>{group.records.length}</small>
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <section className="compare-table-section" aria-label={t('appTitle')}>
      {loading ? <p className="table-status">{t('tableLoading')}</p> : null}
      {groupControls}
      {records.length ? (
        <div className="compare-table-scroll">
          <table className="compare-table">
            <thead>
              {grouped ? (
                <tr>
                  <th scope="col" rowSpan={2} className="compare-table__field-header">
                    {t('fieldName')}
                  </th>
                  {visibleGroups.map((group) => (
                    <th
                      scope="colgroup"
                      colSpan={group.records.length}
                      className="compare-table__group-header"
                      key={group.key}
                    >
                      <button
                        type="button"
                        onClick={() => onToggleGroup(group.key)}
                        aria-label={t('collapseGroup')}
                      >
                        <span>{group.label}</span>
                        <small>{group.records.length}</small>
                      </button>
                    </th>
                  ))}
                </tr>
              ) : null}
              <tr>
                {!grouped ? (
                  <th scope="col" className="compare-table__field-header">
                    {t('fieldName')}
                  </th>
                ) : null}
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
      ) : (
        <p className="table-status">{t('allGroupsCollapsed')}</p>
      )}
    </section>
  );
}
