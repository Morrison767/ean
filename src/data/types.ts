/**
 * Модель данных прототипа.
 *
 * Типы описаны по фикстурам, извлечённым из прежней сборки
 * (см. scripts/extract-legacy-data.mjs). Обязательными сделаны только поля,
 * на которые опирается интерфейс; остальное помечено необязательным — в
 * демо-данных заполнено не всё, и падать из-за пропуска в моке незачем.
 */

/**
 * Уровень риска. Ровно три значения — столько же в данных и в прежней версии;
 * промежуточных «низкий» и «критический» там нет, и придумывать их значит
 * показывать пользователю шкалу, которой система не измеряет.
 */
export type RiskLevel = "none" | "medium" | "high";

/** Ключи риск-тегов из справочника (data/seed/risk-tags.json). */
export type RiskTag =
  | "criminal"
  | "tax_debt"
  | "wanted"
  | "sanctions"
  | "bankrupt"
  | "pep"
  | "court";

export interface Job {
  company: string;
  bin?: string;
  position: string;
  start?: string;
  end?: string;
  city?: string;
  type?: string;
  schedule?: string;
}

/**
 * Запись о трудовой деятельности.
 *
 * Форма повторяет карточку трудового договора в ЕСУТД (Единая система учёта
 * трудовых договоров, enbek.kz): работодатель, должность с кодом НКЗ, номер
 * договора, сроки, вид и режим, основание прекращения. Самозанятость приходит
 * не оттуда, а из госреестра ИП, — поэтому у записи есть `source`: смешивать
 * два реестра в одном списке можно, выдавать один за другой нельзя.
 */
/**
 * Чем запись является: трудовым договором, самозанятостью или только участием
 * в организации. Участие без должности — не работа, и в стаж оно не идёт.
 */
export type EmploymentKind = "contract" | "entrepreneur" | "participation";

export interface Employment {
  kind: EmploymentKind;
  company: string;
  /** БИН работодателя. Если он есть в базе, из записи открывается досье. */
  bin?: string;
  position: string;
  /** Код должности по Национальному классификатору занятий РК. */
  nkz?: string;
  /** Номер трудового договора в ЕСУТД. */
  contract?: string;
  start: string;
  /** Пусто — договор действует на дату выгрузки. */
  end?: string;
  /** Бессрочный, срочный, ГПХ, индивидуальное предпринимательство. */
  contractType?: string;
  /** Режим работы: полная занятость, 0,5 ставки, вахтовый. */
  schedule?: string;
  region?: string;
  /** Вид деятельности работодателя с кодом ОКЭД. */
  activity?: string;
  /** Основание прекращения со ссылкой на статью ТК РК. */
  dismissal?: string;
  /**
   * Роль и доля в организации по ГБД ЮЛ — «Учредитель, доля 45 %».
   *
   * Держим рядом с должностью, а не отдельным списком: в досье уже есть блок
   * «Бизнес и активы», и если тот говорит «учредитель», а трудовая — «ведущий
   * специалист», выглядит это как расхождение, хотя верно и то и другое.
   */
  ownership?: string;
  /** Состояние, которое из дат не выводится: «Приостановлено», «Ликвидировано». */
  status?: string;
  /**
   * Работа в государственном органе.
   *
   * Отдельным признаком, а не по названию организации: от него зависят
   * запрет на предпринимательство и совместительство и проверка перехода к
   * поставщику того же органа, а угадывать это регулярным выражением по
   * названию — значит однажды пропустить орган с необычным названием.
   */
  publicService?: boolean;
  /** Реестр, из которого пришла запись. */
  source?: string;
}

export interface Relative {
  relation: string;
  fullName: string;
  iin?: string;
  phone?: string;
  risk?: RiskLevel;
}

export interface Connection {
  name: string;
  relation: string;
  /** Степень удалённости связи: 1 — прямая. */
  level: number;
  risk?: RiskLevel;
  iin?: string;
  bin?: string;
}

export interface RealEstate {
  type: string;
  cadastral?: string;
  address?: string;
  share?: string;
  registered?: string;
  encumbrance?: string;
}

export interface Vehicle {
  model: string;
  vin?: string;
  plate?: string;
  year?: number | string;
  techPassport?: string;
  encumbrance?: string;
  encumbranceDate?: string;
}

export interface CourtCase {
  kind: string;
  number?: string;
  role?: string;
  status?: string;
  date?: string;
}

export interface Fine {
  reason: string;
  amount: number;
  date?: string;
  paid?: boolean;
}

export interface IncomeYear {
  year: number | string;
  amount: number;
  source?: string;
}

/** Физическое лицо — субъект досье. */
export interface Person {
  id: string;
  iin: string;
  fullName: string;
  dob?: string;
  gender?: string;
  nationality?: string;
  citizenship?: string;
  maritalStatus?: string;
  spouseId?: string;
  spouseName?: string;
  phone?: string;
  email?: string;
  telegram?: string[];
  riskLevel: RiskLevel;
  riskTags?: RiskTag[];
  /** Балл благонадёжности, 0–100. */
  score: number;
  birthPlace?: string;
  lifeStatus?: string;
  regDate?: string;
  rka?: string;
  experience?: string;
  currentJob?: Job;
  /** @deprecated Краткий список из прежней сборки; полная история — в `employment`. */
  jobs?: Job[];
  /** История трудовой деятельности: ЕСУТД (enbek.kz) и госреестр ИП. */
  employment?: Employment[];
  relatives?: Relative[];
  education?: Array<Record<string, string>>;
  documents?: Array<Record<string, string>>;
  flights?: Array<Record<string, string>>;
  railTickets?: Array<Record<string, string>>;
  connections?: Connection[];
  assets?: Array<Record<string, string>>;
  govConnections?: Record<string, unknown>;
  addresses?: Array<Record<string, string>>;
  trustFlags?: string[];
  trustChecks?: unknown[];
  realEstate?: RealEstate[];
  vehicles?: Vehicle[];
  businesses?: Array<Record<string, unknown>>;
  courtCases?: CourtCase[];
  fines?: Fine[];
  income?: IncomeYear[];
  procurement?: Record<string, unknown>;
  finance?: Record<string, unknown>;
}

/** Юридическое лицо. */
export interface Company {
  id: string;
  bin: string;
  name: string;
  okd?: string;
  riskLevel: RiskLevel;
  riskTags?: RiskTag[];
  score: number;
  manager?: { name: string; iin?: string; appointedAt?: string; affiliated?: unknown };
  foundersCount?: number;
  founders?: Array<Record<string, unknown>>;
  foundersDetailed?: Array<Record<string, unknown>>;
  foundersHistory?: Array<Record<string, unknown>>;
  managerHistory?: Array<Record<string, unknown>>;
  registeredAt?: string;
  reRegisteredAt?: string;
  registeringBody?: string;
  address?: string;
  phone?: string;
  website?: string;
  email?: string;
  activityType?: string;
  orgForm?: string;
  ownershipForm?: string;
  businessSize?: string;
  employees?: number;
  nameHistory?: string[];
  finance?: Record<string, unknown>;
  ved?: Record<string, unknown>;
  realEstate?: RealEstate[];
  vehicles?: Vehicle[];
  taxRegime?: string;
  vatPayer?: boolean;
  taxpayerRisk?: string;
  majorTaxpayer?: boolean;
  taxByYear?: Array<{ year: number | string; amount: number }>;
  taxDebt?: number;
  customsDebt?: number;
  bankDetails?: Array<Record<string, string>>;
  licenses?: Array<Record<string, string>>;
  subsidiaries?: Array<Record<string, unknown>>;
  /** Головные организации; в фикстурах бывает пустым массивом. */
  parents?: Array<Record<string, unknown>>;
  /** Связанные лица: общий учредитель, аффилированность по цепочке поставок. */
  relatedEntities?: Array<Record<string, unknown>>;
  /** Чек-лист благонадёжности юрлица — как trustFlags/trustChecks у человека. */
  reliabilityFlags?: string[];
  reliabilityChecks?: string[];
  courtCases?: CourtCase[];
  fines?: Fine[];
  inspections?: Array<Record<string, unknown>>;
  encumbrances?: Array<Record<string, unknown>>;
  enforcementDebt?: unknown;
  execCriminalRecord?: unknown;
  execWanted?: unknown;
  procurement?: Record<string, unknown>;
}

/** Таможенная декларация (ВЭД). */
export interface Declaration {
  id: string;
  date: string;
  type: "import" | "export";
  company: string;
  bin: string;
  partner: string;
  countryCode: string;
  product: string;
  hsCode: string;
  qty: number;
  unit: string;
  valueUsd: number;
  customsKzt: number;
  currency: string;
  risk: RiskLevel;
  flags?: string[];
  esf?: boolean;
}

/** Электронный счёт-фактура. */
export interface Invoice {
  id: string;
  date: string;
  supplier: string;
  supplierBin: string;
  customer: string;
  customerBin: string;
  product: string;
  unit?: string;
  qty: number;
  price: number;
  /** Среднерыночная цена — база для вывода о завышении. */
  avgPrice?: number;
  amount: number;
  status?: string;
  risk: RiskLevel;
  source?: string;
  importExport?: string;
  bank?: string;
}

/** Государственная закупка. */
export interface Procurement {
  id: string;
  date: string;
  customer: string;
  customerBin: string;
  subject: string;
  method: string;
  plannedAmount: number;
  contractAmount: number;
  marketAmount?: number;
  participants: number;
  winner: string;
  winnerBin: string;
  status: string;
  risk: RiskLevel;
  flags?: string[];
  source?: string;
  esf?: boolean;
}

/** Банковская выписка. */
export interface Statement {
  id: string;
  name: string;
  holder: string;
  holderBin: string;
  account: string;
  period: string;
  format: string;
  status: string;
  txCount: number;
  risk: RiskLevel;
  totalIn: number;
  totalOut: number;
  counterparties: number;
}

/** Операция по выписке. */
export interface Transaction {
  id: string;
  stmtId: string;
  date: string;
  counterparty: string;
  counterpartyBin?: string;
  account?: string;
  assignment: string;
  amount: number;
  direction: "in" | "out";
  type?: string;
  risk: RiskLevel;
  flags?: string[];
  esf?: boolean;
}

/** Запись журнала действий пользователя. */
export interface AuditEntry {
  id: string;
  ts: string;
  user: string;
  action: string;
  subject: string;
  subjectType: string;
  ip: string;
  status: string;
}

/** Узел и ребро графа связей. */
export interface GraphNode {
  name: string;
  role?: string;
  bin?: string;
  iin?: string;
  risk?: RiskLevel;
}

export interface GraphEdge {
  /** Индексы или имена концов — в фикстурах встречаются оба варианта. */
  from?: number | string;
  to?: number | string;
  amount?: number;
  date?: string;
  tx?: number;
  assignment?: string;
  flag?: string;
}

export interface SchemeGraph {
  /**
   * Набор, из которого пришла схема. В прежней версии это были четыре
   * отдельные переменные, и проверки смотрели каждая в свою: признак
   * «транзитные схемы» ищет только среди цепочек поставок.
   */
  group: "money" | "circular" | "supply" | "export";
  title: string;
  risk: RiskLevel;
  nodes: GraphNode[];
  edges: GraphEdge[];
  notes?: string[];
}

/** Раздел чек-листа благонадёжности. */
export interface ChecklistSection {
  category: string;
  /** Имя иконки lucide — в фикстуре осталась ссылка из прежней сборки. */
  icon?: string;
  items: string[];
}

/** Субъект поиска — человек или компания в общем списке результатов. */
export type Subject =
  | ({ kind: "person" } & Person)
  | ({ kind: "company" } & Company);
