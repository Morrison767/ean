/**
 * Посев демо-данных.
 *
 * Фикстуры извлечены из прежней сборки и лежат рядом в JSON. Здесь они
 * собираются в одну структуру базы, которую слой хранения кладёт в
 * localStorage при первом запуске.
 *
 * SEED_VERSION поднимается при любом изменении формы данных: хранилище
 * сверяет версию и пересевает базу, вместо того чтобы падать на записи,
 * сохранённой по старой модели.
 */

import audit from "./seed/audit.json";
import companies from "./seed/companies.json";
import declarations from "./seed/declarations.json";
import employment from "./seed/employment.json";
import graphA from "./seed/graph-a.json";
import graphB from "./seed/graph-b.json";
import graphC from "./seed/graph-c.json";
import graphD from "./seed/graph-d.json";
import invoices from "./seed/invoices.json";
import people from "./seed/people.json";
import procurements from "./seed/procurements.json";
import checklistCompany from "./seed/risk-checklist-company.json";
import checklistPerson from "./seed/risk-checklist-person.json";
import statements from "./seed/statements.json";
import transactions from "./seed/transactions.json";

import type {
  AuditEntry,
  ChecklistSection,
  Company,
  Declaration,
  Employment,
  Invoice,
  Person,
  Procurement,
  SchemeGraph,
  Statement,
  Transaction,
} from "./types";

export const SEED_VERSION = 5;

/**
 * JSON приходит с широкими типами (string вместо литеральных объединений),
 * поэтому приведение — через unknown. Это единственное место, где мы
 * доверяем фикстуре на слово; дальше по коду данные уже типизированы.
 */
const as = <T,>(value: unknown) => value as T;

export interface Database {
  people: Person[];
  companies: Company[];
  declarations: Declaration[];
  invoices: Invoice[];
  procurements: Procurement[];
  statements: Statement[];
  transactions: Transaction[];
  audit: AuditEntry[];
  schemes: SchemeGraph[];
  checklists: {
    person: ChecklistSection[];
    company: ChecklistSection[];
  };
}

/**
 * Трудовые биографии лежат отдельным файлом, а не в people.json.
 *
 * people.json собирает скрипт извлечения из прежней сборки; всё дописанное
 * туда руками пропадёт при следующем прогоне. Поэтому новые сведения живут
 * рядом и приклеиваются здесь по идентификатору субъекта.
 */
const EMPLOYMENT = employment as Record<string, Employment[]>;

export function createSeed(): Database {
  return {
    people: as<Person[]>(people).map((p) => ({ ...p, employment: EMPLOYMENT[p.id] })),
    companies: as<Company[]>(companies),
    declarations: as<Declaration[]>(declarations),
    invoices: as<Invoice[]>(invoices),
    procurements: as<Procurement[]>(procurements),
    statements: as<Statement[]>(statements),
    transactions: as<Transaction[]>(transactions),
    audit: as<AuditEntry[]>(audit),
    /* Схемы лежали в прежней сборке четырьмя отдельными переменными.
       Сливаем в один список, но помечаем происхождение: проверки смотрят
       каждая в свой набор, и без пометки они начинают видеть чужие схемы. */
    schemes: [
      ...as<SchemeGraph[]>(graphA).map((s) => ({ ...s, group: "money" as const })),
      ...as<SchemeGraph[]>(graphB).map((s) => ({ ...s, group: "circular" as const })),
      ...as<SchemeGraph[]>(graphC).map((s) => ({ ...s, group: "supply" as const })),
      ...as<SchemeGraph[]>(graphD).map((s) => ({ ...s, group: "export" as const })),
    ],
    checklists: {
      person: as<ChecklistSection[]>(checklistPerson),
      company: as<ChecklistSection[]>(checklistCompany),
    },
  };
}
