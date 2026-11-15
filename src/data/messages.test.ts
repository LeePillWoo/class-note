import { describe, expect, it } from 'vitest'
import { MESSAGE_FIELDS, MESSAGE_KINDS, defaultMessages, fillMessage, lessonTitle, messagePhone } from './messages'

describe('fillMessage', () => {
  it('{칸}을 값으로 바꿈', () => {
    expect(fillMessage('{이름} 학생 {금액} 안내', { 이름: '김하늘', 금액: '16만 원' })).toBe('김하늘 학생 16만 원 안내')
  })

  it('같은 칸이 여러 번 나와도 모두 바꿈', () => {
    expect(fillMessage('{이름}, {이름}', { 이름: '가' })).toBe('가, 가')
  })

  it('값이 빈 칸은 지우고 빈칸을 정리함', () => {
    expect(fillMessage('{이름} 학생 {수업} 수업, {시각}에', { 이름: '가', 수업: '', 시각: '' })).toBe('가 학생 수업, 에')
    expect(fillMessage('보강을 {날짜} {시각} 에 해요', { 날짜: '11월 20일', 시각: '' })).toBe('보강을 11월 20일 에 해요')
  })

  it('모르는 칸은 그대로 둠', () => {
    expect(fillMessage('{이름} {없는칸}', { 이름: '가' })).toBe('가 {없는칸}')
  })
})

describe('기본 문구', () => {
  it('문구마다 안내한 칸만 씀', () => {
    const messages = defaultMessages()
    for (const kind of MESSAGE_KINDS) {
      const used = [...messages[kind].matchAll(/\{([^{}]+)\}/g)].map((match) => match[1])
      expect(used.length).toBeGreaterThan(0)
      for (const key of used) expect(MESSAGE_FIELDS[kind]).toContain(key)
    }
  })
})

describe('lessonTitle, messagePhone', () => {
  it('그룹은 수업 이름, 1:1은 과목 레슨', () => {
    expect(lessonTitle({ kind: 'group', name: '칼림바 초급', subject: '칼림바' })).toBe('칼림바 초급')
    expect(lessonTitle({ kind: 'solo', name: '김하늘', subject: '우쿨렐레' })).toBe('우쿨렐레 레슨')
    expect(lessonTitle({ kind: 'solo', name: '김하늘', subject: '' })).toBe('1:1 레슨')
  })

  it('보호자 번호가 먼저, 없으면 학생 번호', () => {
    expect(messagePhone({ phone: '010-1', guardians: [{ id: 'a', relation: '어머니', phone: '010-2' }] })).toBe('010-2')
    expect(messagePhone({ phone: '010-1', guardians: [{ id: 'a', relation: '어머니', phone: '' }] })).toBe('010-1')
    expect(messagePhone(undefined)).toBe('')
  })
})
