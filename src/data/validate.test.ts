import { describe, expect, it } from 'vitest'
import { parseBackup } from './backup'
import { validateRecord } from './validate'

const base = { id: 'x', createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z' }

describe('validateRecord', () => {
  it('학생: 이름과 등록일이 없으면 버림, 틀린 칸은 고치거나 뺌', () => {
    expect(validateRecord('students', { ...base, name: 42, enrolledOn: '2026-11-01' })).toBeNull()
    expect(validateRecord('students', { ...base, name: '가', enrolledOn: '어제' })).toBeNull()
    const student = validateRecord('students', {
      ...base,
      name: '가',
      enrolledOn: '2026-11-01',
      color: 'url(https://example.com/x.png)',
      photo: 'https://example.com/x.png',
      pauses: 'nope',
      guardians: [{ id: 'g', relation: '어머니', phone: '010' }, { phone: 1 }],
      extra: '<script>',
    }) as unknown as Record<string, unknown>
    expect(student.color).toMatch(/^#[0-9a-f]{6}$/i)
    expect(student).not.toHaveProperty('photo')
    expect(student).not.toHaveProperty('extra')
    expect(student.pauses).toEqual([])
    expect(student.guardians).toEqual([{ id: 'g', relation: '어머니', phone: '010' }])
  })

  it('학생 사진은 기기 안의 그림(data:image)만', () => {
    const photo = 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='
    expect(validateRecord('students', { ...base, name: '가', enrolledOn: '2026-11-01', photo })).toHaveProperty('photo', photo)
  })

  it('수업: 일정과 수강료가 맞아야 함, 시각 모양 검사', () => {
    const cls = { ...base, name: '반', startedOn: '2026-11-01', fee: { amount: 100, sessionCount: 4 } }
    expect(validateRecord('classes', { ...cls, schedules: [] })).toBeNull()
    expect(validateRecord('classes', { ...cls, schedules: [{ id: 'p', startsOn: '2026-11-01', value: [{ weekday: 1, start: '16:00', end: '17:00' }] }], fee: { amount: -1, sessionCount: 4 } })).toBeNull()
    const ok = validateRecord('classes', {
      ...cls,
      schedules: [{ id: 'p', startsOn: '2026-11-01', value: [{ weekday: 1, start: '16:00', end: '17:00' }, { weekday: 9, start: '1', end: '2' }] }],
    }) as unknown as { schedules: { value: unknown[] }[]; kind: string }
    expect(ok.schedules[0].value).toHaveLength(1)
    expect(ok.kind).toBe('group')
  })

  it('출결·수강: 꼭 필요한 칸이 없으면 버림', () => {
    expect(validateRecord('enrollments', { ...base, classId: 'c', studentId: 's' })).toBeNull()
    expect(validateRecord('attendance', { ...base, classId: 'c', studentId: 's', date: '2026-11-01', status: 'late' })).toBeNull()
    expect(validateRecord('attendance', { ...base, classId: 'c', studentId: 's', date: '2026-11-01', status: 'present' })).not.toBeNull()
  })

  it('기본 규칙: 맞는 칸만 남김', () => {
    const settings = validateRecord('settings', { ...base, id: 'app', timeStep: 15, paymentsEnabled: true, sessionCount: '8', messages: {} })
    expect(settings).toEqual({ id: 'app', createdAt: base.createdAt, updatedAt: base.updatedAt, paymentsEnabled: true })
  })

  it('id가 없거나 너무 길면 버림', () => {
    expect(validateRecord('lessonNotes', { classId: 'c', date: '2026-11-01' })).toBeNull()
    expect(validateRecord('lessonNotes', { id: 'x'.repeat(201), classId: 'c', date: '2026-11-01' })).toBeNull()
  })
})

describe('parseBackup', () => {
  it('틀린 기록과 같은 id는 빼고 몇 개 뺐는지 알려줌', () => {
    const file = {
      app: 'class-note',
      version: 1,
      exportedAt: '2026-11-15T00:00:00Z',
      data: {
        enrollments: [
          { ...base, id: 'e1', classId: 'c', studentId: 's', startedOn: '2026-11-01' },
          { ...base, id: 'e2', classId: 'c', studentId: 's' },
          { ...base, id: 'e1', classId: 'c', studentId: 's', startedOn: '2026-11-02' },
        ],
        __proto__: [{ id: 'evil' }],
      },
    }
    const result = parseBackup(JSON.stringify(file))
    if ('error' in result) throw new Error(result.error)
    expect(result.summary.counts.enrollments).toBe(1)
    expect(result.summary.skipped).toBe(2)
    expect(({} as Record<string, unknown>).id).toBeUndefined()
  })
})
