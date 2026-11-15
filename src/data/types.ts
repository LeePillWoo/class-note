import type { DateStr, TimeStr, Weekday } from '../utils/date'

/** 모든 기록에 공통으로 들어가는 항목입니다. updatedAt은 백업을 합칠 때 더 최근 기록을 고르는 데 씁니다. */
export interface BaseRecord {
  id: string
  createdAt: string
  updatedAt: string
}

// ===== 학생 =====

/** 보호자 연락처. 예: 어머니 010-0000-0000 */
export interface Guardian {
  id: string
  /** 관계. 예: 어머니, 아버지 */
  relation: string
  phone: string
}

/** 쉬는 기간(휴원). from부터 to까지 수업을 만들지 않습니다. to가 없으면 아직 쉬는 중입니다. */
export interface PauseRange {
  from: DateStr
  to?: DateStr
}

export interface Student extends BaseRecord {
  name: string
  color: string
  /** 학교와 학년, 또는 간단한 소개. 예: 한빛초 5학년, 성인 */
  school: string
  phone: string
  guardians: Guardian[]
  /** 등록일 (정보로만 씁니다. 수업은 반에 넣은 날부터 셉니다) */
  enrolledOn: DateStr
  pauses: PauseRange[]
  /** 그만둔 날(마지막으로 다닌 날). 이날 뒤로는 수업을 만들지 않습니다. */
  leftOn?: DateStr
  memo: string
}

// ===== 반 =====

/** 요일과 시간. 예: 월 17:00~18:30 */
export interface TimeSlot {
  weekday: Weekday
  start: TimeStr
  end: TimeStr
}

/**
 * 기간별 설정. 학기 중에 수업 요일이 바뀌면 새 기간을 추가합니다.
 * 첫 기간은 반 시작일부터, 다음 기간은 startsOn부터 적용됩니다. 지난 기록은 그대로 남습니다.
 */
export interface Period<T> {
  id: string
  /** 이 설정을 적용하는 첫날. 첫 기간은 반 시작일과 같습니다. */
  startsOn: DateStr
  value: T
}

/** 수강료: 몇 회에 얼마. 예: 8회 24만 원. (횟수로만 받습니다) */
export interface FeeRule {
  /** 0이면 금액 미정 */
  amount: number
  sessionCount: number
}

/** 결석한 수업을 회차로 셀지 */
export type AbsenceCounting = 'never' | 'always' | 'ifNoMakeup'

/** 보강 가능 기간 */
export type MakeupWindow =
  | { type: 'days'; days: number }
  | { type: 'sameMonth' }
  | { type: 'nextMonthEnd' }
  | { type: 'none' }

export interface MakeupRule {
  /** 결석하면 보강 */
  forAbsence: boolean
  /** 휴강하면 보강 */
  forCancellation: boolean
  window: MakeupWindow
}

/** 반. 1:1 수업도 학생이 한 명인 반으로 다룹니다. */
export interface ClassGroup extends BaseRecord {
  name: string
  /** 과목. 예: 우쿨렐레, 칼림바 */
  subject: string
  color: string
  /** 장소. 예: 1강의실 */
  place: string
  memo: string
  order: number
  /** 반 시작일. 이날부터 수업일을 만듭니다. */
  startedOn: DateStr
  /** 반을 닫은 날. 이날 뒤로는 수업일을 만들지 않습니다. */
  endedOn?: DateStr
  /** 수업 일정 (기간별, startsOn 순서). 한 요일에 수업은 하나입니다. */
  schedules: Period<TimeSlot[]>[]
  /** 기본 수강료 */
  fee: FeeRule
  absenceCounting: AbsenceCounting
  makeupRule: MakeupRule
}

/** 수강: 어느 학생이 어느 반을 언제부터 듣는지 */
export interface Enrollment extends BaseRecord {
  classId: string
  studentId: string
  /** 이날부터 출결과 회차를 셉니다. */
  startedOn: DateStr
  /** 반에서 나간 날(마지막 수업일) */
  endedOn?: DateStr
  /** 듣는 요일. 없으면 반의 모든 수업 (주 2회 반에서 주 1회만 듣는 학생) */
  weekdays?: Weekday[]
  /** 이 학생만 다른 수강료. 없으면 반의 기본 수강료 */
  fee?: FeeRule
  /** 앱에 넣을 때 이미 받은 수강료로 남아 있던 수업 횟수 */
  startCredit: number
}

// ===== 수업, 출결 =====

/** 수업 하루의 기록(휴강, 메모). 기록할 것이 있을 때만 저장합니다. id는 `${classId}:${date}` */
export interface LessonNote extends BaseRecord {
  classId: string
  date: DateStr
  cancelled: boolean
  memo: string
}

/** 출석, 결석 (지각·조퇴는 따로 적지 않습니다) */
export type AttendanceStatus = 'present' | 'absent'

/** 출결 기록. 체크한 것만 저장합니다. id는 `${classId}:${date}:${studentId}` */
export interface Attendance extends BaseRecord {
  classId: string
  studentId: string
  date: DateStr
  status: AttendanceStatus
  /** 결석 사유 등 */
  memo: string
}

// ===== 보강 =====

/** 저장하는 보강 상태. 대기/예정/기한 만료는 날짜로 계산합니다. (makeupRules.ts) */
export type MakeupStatus = 'open' | 'done' | 'skipped'

/** 결석이나 휴강으로 생긴 보강 하나. id는 `${classId}:${missedOn}:${studentId}` */
export interface Makeup extends BaseRecord {
  classId: string
  studentId: string
  /** 원래 수업 날짜 */
  missedOn: DateStr
  reason: 'absent' | 'cancelled'
  /** 보강 기한. 없으면 기한 없음 */
  deadline?: DateStr
  /** 예정일 (완료하면 실제로 한 날) */
  scheduledOn?: DateStr
  start?: TimeStr
  end?: TimeStr
  /** 다른 수업 시간에 같이 듣게 했으면 그 반 */
  joinClassId?: string
  status: MakeupStatus
  memo: string
}

// ===== 납부 =====

/** 수강료, 교재비, 특강비, 기타 */
export type PaymentKind = 'tuition' | 'textbook' | 'special' | 'other'

/** 이체, 카드, 현금, 기타 */
export type PaymentMethod = 'transfer' | 'card' | 'cash' | 'other'

/**
 * 납부 기록.
 * - 수강료(tuition): 받았을 때만 저장합니다. sessions만큼 수업 횟수가 채워집니다. (tuition.ts)
 * - 그 밖(교재비 등): 청구할 때 저장하고, 받으면 paidOn을 넣습니다.
 */
export interface Payment extends BaseRecord {
  studentId: string
  /** 수강료면 어느 반 수강료인지 */
  classId?: string
  kind: PaymentKind
  /** 이름. 예: '8회분', '1학기 교재' */
  title: string
  amount: number
  /** 수강료: 이 납부로 채워지는 수업 횟수 */
  sessions?: number
  /** 받기로 한 날 */
  dueOn: DateStr
  /** 실제로 받은 날. 없으면 아직 못 받음 */
  paidOn?: DateStr
  method?: PaymentMethod
  memo: string
}

/** 저장하는 데이터 종류입니다. 새 종류는 여기에 추가합니다. */
export interface Collections {
  students: Student
  classes: ClassGroup
  enrollments: Enrollment
  lessonNotes: LessonNote
  attendance: Attendance
  makeups: Makeup
  payments: Payment
}

export type CollectionName = keyof Collections

export type Database = { [K in CollectionName]: Collections[K][] }

/** 저장소에 보내는 변경 하나. 여러 개를 묶어 한 번에 저장합니다. */
export type Change =
  | { [K in CollectionName]: { type: 'put'; collection: K; item: Collections[K] } }[CollectionName]
  | { type: 'remove'; collection: CollectionName; id: string }
