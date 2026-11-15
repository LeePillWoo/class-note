import { addDays, weekdayOf, type DateStr, type Weekday } from '../utils/date'
import { setAttendanceChanges, setCancelledChanges } from './attendanceChanges'
import { PALETTE } from './colors'
import { withPlan, type MakeupPlan } from './makeups'
import { tuitionPayment } from './payments'
import { defaultMakeupRule } from './rules'
import { buildIndex, classLessons, makeupId, rosterOn } from './schedule'
import { applyChanges, emptyDatabase } from './storage'
import { tuitionState } from './tuition'
import type { Change, ClassGroup, Database, Enrollment, PaymentMethod, Student, TimeSlot } from './types'

/**
 * 둘러보기용 예시 데이터. 이름과 전화번호는 모두 지어낸 것입니다.
 * 오늘 날짜를 기준으로 6주 전부터 다닌 것으로 만들어, 언제 넣어도 출결·보강·받을 돈이 골고루 보입니다.
 */
export function buildSampleDatabase(todayStr: DateStr, makeId: () => string, now: string): Database {
  let db = emptyDatabase()
  const apply = (changes: Change[]) => {
    db = applyChanges(db, changes)
  }
  const startedOn = addDays(todayStr, -42)
  const todayWeekday = weekdayOf(todayStr)

  // ===== 학생 =====
  const people: [name: string, school: string, guardian: string][] = [
    ['김하준', '한빛초 3학년', '어머니'],
    ['이서윤', '한빛초 5학년', '어머니'],
    ['박지호', '새솔초 2학년', '아버지'],
    ['최예린', '새솔초 4학년', '어머니'],
    ['정민서', '푸른중 1학년', '어머니'],
    ['강도윤', '한빛초 6학년', '할머니'],
    ['윤지아', '성인', ''],
    ['한서준', '성인', ''],
  ]
  const students = people.map(([name, school, guardian], position): Student => ({
    id: makeId(),
    name,
    color: PALETTE[position % PALETTE.length].value,
    school,
    phone: guardian ? '' : `010-0000-00${String(position + 11)}`,
    guardians: guardian ? [{ id: makeId(), relation: guardian, phone: `010-0000-00${String(position + 31)}` }] : [],
    enrolledOn: startedOn,
    pauses: [],
    memo: '',
    createdAt: now,
    updatedAt: now,
  }))
  apply(students.map((item): Change => ({ type: 'put', collection: 'students', item })))
  const student = (name: string) => students.find((item) => item.name === name)!

  // ===== 반 =====
  const makeClass = (order: number, name: string, subject: string, place: string, slots: TimeSlot[], sessionCount: number, amount: number): ClassGroup => ({
    id: makeId(),
    name,
    subject,
    color: PALETTE[(order + 2) % PALETTE.length].value,
    place,
    memo: '',
    order,
    startedOn,
    schedules: [{ id: makeId(), startsOn: startedOn, value: slots }],
    fee: { amount, sessionCount },
    absenceCounting: 'ifNoMakeup',
    makeupRule: defaultMakeupRule(),
    createdAt: now,
    updatedAt: now,
  })
  const slot = (weekday: Weekday, start: string, end: string): TimeSlot => ({ weekday, start, end })
  const beginner = makeClass(0, '우쿨렐레 초급반', '우쿨렐레', '1교실', [slot(1, '16:00', '16:50'), slot(3, '16:00', '16:50')], 8, 160_000)
  const kalimba = makeClass(1, '칼림바 취미반', '칼림바', '2교실', [slot(2, '19:00', '19:50'), slot(4, '19:00', '19:50')], 8, 140_000)
  const saturday = makeClass(2, '우쿨렐레 토요반', '우쿨렐레', '1교실', [slot(6, '11:00', '12:00')], 4, 90_000)
  // 예시를 넣는 날에 수업이 하나는 있도록, 1:1 레슨은 오늘 요일로 잡습니다.
  const solo = makeClass(3, '이서윤 1:1 레슨', '우쿨렐레', '2교실', [slot(todayWeekday, '17:00', '17:40')], 4, 120_000)
  const classes = [beginner, kalimba, saturday, solo]
  apply(classes.map((item): Change => ({ type: 'put', collection: 'classes', item })))

  // ===== 수강 =====
  const members: [ClassGroup, string[]][] = [
    [beginner, ['김하준', '박지호', '최예린', '강도윤']],
    [kalimba, ['윤지아', '한서준', '정민서']],
    [saturday, ['최예린', '한서준']],
    [solo, ['이서윤']],
  ]
  for (const [cls, names] of members) {
    apply(
      names.map((name): Change => {
        const item: Enrollment = { id: makeId(), classId: cls.id, studentId: student(name).id, startedOn, startCredit: 0, createdAt: now, updatedAt: now }
        return { type: 'put', collection: 'enrollments', item }
      }),
    )
  }

  // ===== 출결 =====
  const yesterday = addDays(todayStr, -1)
  /** 지난 수업 날짜 (최근 것부터) */
  const pastDates = (cls: ClassGroup) => classLessons(cls, startedOn, yesterday).map((lesson) => lesson.date).reverse()
  const beginnerDates = pastDates(beginner)
  const kalimbaDates = pastDates(kalimba)
  // 빠진 날: [반, 날짜, 이름] — 나머지는 모두 출석
  const absences: [ClassGroup, DateStr | undefined, string][] = [
    [beginner, beginnerDates[2], '박지호'],
    [beginner, beginnerDates[4], '최예린'],
    [beginner, beginnerDates[7], '강도윤'],
  ]
  const cancelledOn = kalimbaDates[3]
  // 가장 최근 초급반 수업은 아직 체크하지 않은 것으로 둡니다. (홈의 '출결을 안 적은 수업')
  const unchecked = beginnerDates[0]

  for (const cls of classes) {
    for (const lesson of classLessons(cls, startedOn, yesterday)) {
      if (cls === kalimba && lesson.date === cancelledOn) {
        apply(setCancelledChanges(db, cls.id, lesson.date, true, now))
        continue
      }
      if (cls === beginner && lesson.date === unchecked) continue
      for (const { student: member } of rosterOn(buildIndex(db), cls.id, lesson.date)) {
        const absent = absences.some(([target, date, name]) => target === cls && date === lesson.date && name === member.name)
        apply(setAttendanceChanges(db, cls.id, lesson.date, member.id, absent ? 'absent' : 'present', now))
      }
    }
  }

  // ===== 보강 =====
  const editMakeup = (cls: ClassGroup, missedOn: DateStr | undefined, name: string, plan: MakeupPlan, status: 'open' | 'done') => {
    if (!missedOn) return
    const makeup = db.makeups.find((item) => item.id === makeupId(cls.id, missedOn, student(name).id))
    if (makeup) apply([{ type: 'put', collection: 'makeups', item: { ...withPlan(makeup, plan), status, updatedAt: now } }])
  }
  // 최예린: 모레 따로 시간을 잡음 (예정) / 박지호: 아직 날짜를 못 잡음 (대기)
  editMakeup(beginner, beginnerDates[4], '최예린', { date: addDays(todayStr, 2), start: '17:00', end: '17:50' }, 'open')
  // 강도윤: 빠진 주 토요일에 토요반 수업을 같이 듣고 끝냄 (완료)
  if (beginnerDates[7]) {
    const joinOn = classLessons(saturday, beginnerDates[7], yesterday)[0]
    if (joinOn) editMakeup(beginner, beginnerDates[7], '강도윤', { date: joinOn.date, start: joinOn.start, end: joinOn.end, joinClassId: saturday.id }, 'done')
  }
  // 칼림바 휴강: 윤지아만 며칠 뒤 보강을 마침, 나머지는 대기 (한 번에 잡기 예시)
  if (cancelledOn) editMakeup(kalimba, cancelledOn, '윤지아', { date: addDays(cancelledOn, 3), start: '18:00', end: '18:50' }, 'done')

  // ===== 납부 =====
  const methods: PaymentMethod[] = ['transfer', 'card', 'cash']
  /** 받을 날이 된 수강료를 앞에서부터 count번 받은 것으로 적습니다. */
  const receive = (cls: ClassGroup, name: string, count: number) => {
    for (let round = 0; round < count; round++) {
      const state = tuitionState(buildIndex(db), student(name).id, cls.id, todayStr)
      const due = state?.dues[0]
      if (!due || due.dueOn > todayStr) return
      const input = {
        studentId: due.studentId,
        classId: due.classId,
        sessions: due.sessions,
        amount: due.amount,
        dueOn: due.dueOn,
        paidOn: due.dueOn,
        method: methods[(name.length + round + cls.order) % methods.length],
        memo: '',
      }
      apply([{ type: 'put', collection: 'payments', item: tuitionPayment(input, makeId(), now) }])
    }
  }
  // 대부분 밀리지 않고 냄. 박지호(초급반)와 한서준(칼림바)은 두 번째 수강료가 밀려 있음
  receive(beginner, '김하준', 9)
  receive(beginner, '최예린', 9)
  receive(beginner, '강도윤', 9)
  receive(beginner, '박지호', 1)
  receive(kalimba, '윤지아', 9)
  receive(kalimba, '정민서', 9)
  receive(kalimba, '한서준', 1)
  receive(saturday, '최예린', 9)
  receive(saturday, '한서준', 9)
  receive(solo, '이서윤', 9)
  // 교재비: 아직 못 받음
  apply([
    {
      type: 'put',
      collection: 'payments',
      item: {
        id: makeId(),
        studentId: student('김하준').id,
        classId: beginner.id,
        kind: 'textbook',
        title: '우쿨렐레 교본 1권',
        amount: 15_000,
        dueOn: addDays(todayStr, -3),
        memo: '',
        createdAt: now,
        updatedAt: now,
      },
    },
  ])

  return db
}
