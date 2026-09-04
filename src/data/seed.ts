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
  Invoice,
  Person,
  Procurement,
  SchemeGraph,
  Statement,
  Transaction,
} from "./types";

export const SEED_VERSION = 1;

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

export function createSeed(): Database {
  return {
    people: as<Person[]>(people),
    companies: as<Company[]>(companies),
    declarations: as<Declaration[]>(declarations),
    invoices: as<Invoice[]>(invoices),
    procurements: as<Procurement[]>(procurements),
    statements: as<Statement[]>(statements),
    transactions: as<Transaction[]>(transactions),
    audit: as<AuditEntry[]>(audit),
    /* Схемы лежали в прежней сборке четырьмя отдельными переменными. */
    schemes: [
      ...as<SchemeGraph[]>(graphA),
      ...as<SchemeGraph[]>(graphB),
      ...as<SchemeGraph[]>(graphC),
      ...as<SchemeGraph[]>(graphD),
    ],
    checklists: {
      person: as<ChecklistSection[]>(checklistPerson),
      company: as<ChecklistSection[]>(checklistCompany),
    },
  };
}
