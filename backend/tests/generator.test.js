import assert from 'assert';
import { generateCombinations } from '../utils/generator.js';
import { Section } from '../models/Section.js';

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
  Section.find = () => ({
    populate: () => Promise.resolve([])
  });
};

// Mock data structures matching schema output
const mockCourse1 = { _id: 'course1', title: 'CS 010A', creditHours: { low: 4, high: 4 } };
const mockCourse2 = { _id: 'course2', title: 'MATH 009B', creditHours: { low: 4, high: 4 } };

const mockLec1 = {
  _id: 'lec1',
  courseId: mockCourse1,
  subject: 'CS',
  courseNumber: '010A',
  courseTitle: 'CS 010A',
  creditHours: 4,
  scheduleType: { code: 'LEC' },
  meetingTimes: [{ weekDays: ['M', 'W'], startTime: '10:00', endTime: '11:20' }],
  linkIdentifier: 'A',
  toObject() { return this; }
};

const mockLabA = {
  _id: 'laba',
  courseId: mockCourse1,
  subject: 'CS',
  courseNumber: '010A',
  courseTitle: 'CS 010A',
  creditHours: 0,
  scheduleType: { code: 'LAB' },
  meetingTimes: [{ weekDays: ['T'], startTime: '09:00', endTime: '11:50' }],
  linkIdentifier: 'A',
  toObject() { return this; }
};

const mockLabB = {
  _id: 'labb',
  courseId: mockCourse1,
  subject: 'CS',
  courseNumber: '010A',
  courseTitle: 'CS 010A',
  creditHours: 0,
  scheduleType: { code: 'LAB' },
  meetingTimes: [{ weekDays: ['T'], startTime: '14:00', endTime: '16:50' }],
  linkIdentifier: 'B',
  toObject() { return this; }
};

const mockMath1 = {
  _id: 'math1',
  courseId: mockCourse2,
  subject: 'MATH',
  courseNumber: '009B',
  courseTitle: 'MATH 009B',
  creditHours: 4,
  scheduleType: { code: 'LEC' },
  meetingTimes: [{ weekDays: ['M', 'W'], startTime: '10:30', endTime: '11:50' }], // Conflicts with CS Lec
  linkIdentifier: null,
  toObject() { return this; }
};

const mockMath2 = {
  _id: 'math2',
  courseId: mockCourse2,
  subject: 'MATH',
  courseNumber: '009B',
  courseTitle: 'MATH 009B',
  creditHours: 4,
  scheduleType: { code: 'LEC' },
  meetingTimes: [{ weekDays: ['M', 'W'], startTime: '13:00', endTime: '14:20' }], // Free
  linkIdentifier: null,
  toObject() { return this; }
};

const main = async () => {
  console.log('Running Generator unit tests...');

  await runTest('generateCombinations - should generate basic combinations resolving links', async () => {
    resetMocks();
    Section.find = (query) => ({
      populate: () => Promise.resolve([mockLec1, mockLabA, mockLabB])
    });

    const results = await generateCombinations(['course1'], '202620');

    // Should only yield 1 schedule: Lec1 paired with Lab A (mismatched Lab B is skipped)
    assert.strictEqual(results.length, 1);
    const schedule = results[0];
    assert.strictEqual(schedule.totalUnits, 4);
    assert.strictEqual(schedule.groups.length, 1);
    assert.strictEqual(schedule.groups[0].sections.length, 2); // Lecture + Lab A
    assert.ok(schedule.groups[0].sections.find(s => s._id === 'lec1'));
    assert.ok(schedule.groups[0].sections.find(s => s._id === 'laba'));
  });

  await runTest('generateCombinations - should detect time conflicts and skip overlapping sections', async () => {
    resetMocks();
    Section.find = () => ({
      populate: () => Promise.resolve([mockLec1, mockLabA, mockMath1, mockMath2])
    });

    const results = await generateCombinations(['course1', 'course2'], '202620');

    // Should yield 1 combination containing CS Lec, CS Lab A, and MATH 2 (MATH 1 skipped due to conflict)
    assert.strictEqual(results.length, 1);
    const schedule = results[0];
    assert.strictEqual(schedule.totalUnits, 8);
    const mathGroup = schedule.groups.find(g => g.courseId === 'course2');
    assert.strictEqual(mathGroup.sections[0]._id, 'math2');
  });

  await runTest('generateCombinations - should force lockedSectionIds in combinations', async () => {
    resetMocks();
    
    // Mock database queries
    Section.find = (query) => ({
      populate: () => {
        if (query._id && query._id.$in) {
          // Locked search query
          return Promise.resolve([mockMath2]);
        }
        // General scope query
        return Promise.resolve([mockLec1, mockLabA, mockLabB, mockMath1, mockMath2]);
      }
    });

    const results = await generateCombinations(['course1'], '202620', ['math2']);

    // Should yield 1 combination containing the locked section (mockMath2) paired with valid CS components
    assert.strictEqual(results.length, 1);
    const schedule = results[0];
    const mathGroup = schedule.groups.find(g => g.courseId === 'course2');
    assert.strictEqual(mathGroup.sections[0]._id, 'math2');
    
    const csGroup = schedule.groups.find(g => g.courseId === 'course1');
    assert.strictEqual(csGroup.sections.length, 2);
  });

  console.log('All generator tests passed successfully.');
};

main();
