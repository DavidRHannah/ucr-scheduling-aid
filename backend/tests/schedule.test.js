import assert from 'assert';
import {
  createSchedule,
  getSchedules,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
  analyzeSchedule,
  exportIcs
} from '../controllers/scheduleController.js';
import { Schedule } from '../models/Schedule.js';

const runTest = async (name, fn) => {
  try {
    await fn();
    console.log(`PASS: ${name}`);
  } catch (error) {
    console.error(`FAIL: ${name}`);
    console.error(error);
    process.exit(1);
  }
};

const resetMocks = () => {
  Schedule.create = () => Promise.resolve({});
  Schedule.find = () => ({
    populate: () => Promise.resolve([])
  });
  Schedule.findById = () => ({
    populate: () => Promise.resolve(null)
  });
  Schedule.deleteOne = () => Promise.resolve({});
};

class MockResponse {
  constructor() {
    this.statusCode = 200;
    this.body = null;
    this.headers = {};
  }
  status(code) {
    this.statusCode = code;
    return this;
  }
  json(data) {
    this.body = data;
    return this;
  }
  setHeader(name, val) {
    this.headers[name] = val;
    return this;
  }
  send(data) {
    this.body = data;
    return this;
  }
}

// Mock section data
const mockSectionA = {
  _id: 'secA',
  crn: '11111',
  creditHours: 4,
  subject: 'CS',
  courseNumber: '100',
  courseTitle: 'Software Construction',
  scheduleType: { code: 'LEC', description: 'Lecture' },
  instructor: 'Staff',
  meetingTimes: [{ weekDays: ['M', 'W'], startTime: '10:00', endTime: '11:20' }]
};

const mockSectionB = {
  _id: 'secB',
  crn: '22222',
  creditHours: 4,
  subject: 'MATH',
  courseNumber: '009C',
  courseTitle: 'Calculus III',
  scheduleType: { code: 'LEC', description: 'Lecture' },
  instructor: 'Staff',
  meetingTimes: [{ weekDays: ['M', 'W'], startTime: '12:00', endTime: '13:20' }]
};

const main = async () => {
  console.log('Running Schedule Controller unit tests...');

  await runTest('createSchedule - should save schedule document', async () => {
    resetMocks();
    Schedule.create = (payload) => {
      assert.strictEqual(payload.userId, 'user-123');
      assert.strictEqual(payload.name, 'My Plan');
      assert.deepStrictEqual(payload.sectionIds, ['secA']);
      return Promise.resolve({ _id: 'sched-1', ...payload });
    };

    const req = {
      user: { id: 'user-123' },
      body: { name: 'My Plan', termCode: '202620', sectionIds: ['secA'] }
    };
    const res = new MockResponse();

    await createSchedule(req, res);

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body._id, 'sched-1');
  });

  await runTest('getScheduleById - should reject unauthorized owners', async () => {
    resetMocks();
    Schedule.findById = () => ({
      populate: () => Promise.resolve({
        userId: 'owner-different',
        name: 'Secret Schedule'
      })
    });

    const req = {
      params: { id: '683d1a2b4f1c2d3e4f5a6b7c' },
      user: { id: 'user-123' }
    };
    const res = new MockResponse();

    await getScheduleById(req, res);

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.message.includes('Forbidden'), true);
  });

  await runTest('analyzeSchedule - should calculate gap and credit statistics', async () => {
    resetMocks();
    Schedule.findById = () => ({
      populate: () => Promise.resolve({
        userId: 'user-123',
        sectionIds: [mockSectionA, mockSectionB]
      })
    });

    const req = {
      params: { id: '683d1a2b4f1c2d3e4f5a6b7c' },
      user: { id: 'user-123' }
    };
    const res = new MockResponse();

    await analyzeSchedule(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.totalUnits, 8);
    assert.strictEqual(res.body.totalClassMinutes, 320); // (80 mins * 2 days) * 2 sections
    assert.strictEqual(res.body.earliestStart, '10:00');
    assert.strictEqual(res.body.latestEnd, '13:20');
    assert.deepStrictEqual(res.body.activeDays, ['M', 'W']);
    
    // Gap minutes: class A ends 11:20, B starts 12:00 => 40 minutes gap per day * 2 days = 80 total
    assert.strictEqual(res.body.totalGapMinutes, 80);
    assert.strictEqual(res.body.conflicts.length, 0);
  });

  await runTest('exportIcs - should compile RFC 5545 iCalendar stream', async () => {
    resetMocks();
    Schedule.findById = () => ({
      populate: () => Promise.resolve({
        name: 'Fall Quarter',
        sectionIds: [mockSectionA]
      })
    });

    // Options base64url-encoded: { "titleFormat": { "titleCase": true } }
    // { "titleFormat": { "titleCase": true } } -> {"titleFormat":{"titleCase":true}}
    // Base64: eyJ0aXRsZUZvcm1hdCI6eyJ0aXRsZUNhc2UiOnRydWV9fQ
    const optionsBase64 = 'eyJ0aXRsZUZvcm1hdCI6eyJ0aXRsZUNhc2UiOnRydWV9fQ';

    const req = {
      params: { scheduleId: '683d1a2b4f1c2d3e4f5a6b7c' },
      query: { options: optionsBase64 }
    };
    const res = new MockResponse();

    await exportIcs(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.headers['Content-Type'], 'text/calendar; charset=utf-8');
    assert.ok(res.body.includes('BEGIN:VCALENDAR'));
    assert.ok(res.body.includes('SUMMARY:Cs100 - Software Construction')); // Title-cased summary
    assert.ok(res.body.includes('RRULE:FREQ=WEEKLY'));
    assert.ok(res.body.includes('END:VCALENDAR'));
  });

  console.log('All schedule tests passed successfully.');
};

main();
