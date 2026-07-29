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

// Real Banner section data (EN-AbetDepth.json, physics-subject.json) type-prefixes
// linkIdentifier per schedule-type: a lecture's own identifier is "L1", its matching
// lab's is "B1" -- the trailing digit is what ties them together, not the full string.
const mockLec1 = {
  _id: 'lec1',
  courseId: mockCourse1,
  subject: 'CS',
  courseNumber: '010A',
  courseTitle: 'CS 010A',
  creditHours: 4,
  scheduleType: { code: 'LEC' },
  meetingTimes: [{ weekDays: ['M', 'W'], startTime: '10:00', endTime: '11:20' }],
  linkIdentifier: 'L1',
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
  linkIdentifier: 'B1',
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
  linkIdentifier: 'B2',
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

// Reproduces the real PHYS 002B shape: two independent lecture sections, each with
// its own linked discussion group (L1<->D1, L2<->D2). A course, department, and
// generatorController are otherwise uninvolved; this isolates the link-matching rule.
const mockCourse3 = { _id: 'course3', title: 'PHYS 040A', creditHours: { low: 4, high: 4 } };

const mockPhysLec1 = {
  _id: 'physlec1',
  courseId: mockCourse3,
  subject: 'PHYS',
  courseNumber: '040A',
  courseTitle: 'PHYS 040A',
  creditHours: 4,
  scheduleType: { code: 'LEC' },
  meetingTimes: [{ weekDays: ['M'], startTime: '09:00', endTime: '09:50' }],
  linkIdentifier: 'L1',
  toObject() { return this; }
};

const mockPhysLec2 = {
  _id: 'physlec2',
  courseId: mockCourse3,
  subject: 'PHYS',
  courseNumber: '040A',
  courseTitle: 'PHYS 040A',
  creditHours: 4,
  scheduleType: { code: 'LEC' },
  meetingTimes: [{ weekDays: ['M'], startTime: '10:00', endTime: '10:50' }],
  linkIdentifier: 'L2',
  toObject() { return this; }
};

const mockPhysDis1 = {
  _id: 'physdis1',
  courseId: mockCourse3,
  subject: 'PHYS',
  courseNumber: '040A',
  courseTitle: 'PHYS 040A',
  creditHours: 0,
  scheduleType: { code: 'DIS' },
  meetingTimes: [{ weekDays: ['W'], startTime: '09:00', endTime: '09:50' }],
  linkIdentifier: 'D1',
  toObject() { return this; }
};

const mockPhysDis2 = {
  _id: 'physdis2',
  courseId: mockCourse3,
  subject: 'PHYS',
  courseNumber: '040A',
  courseTitle: 'PHYS 040A',
  creditHours: 0,
  scheduleType: { code: 'DIS' },
  meetingTimes: [{ weekDays: ['W'], startTime: '10:00', endTime: '10:50' }],
  linkIdentifier: 'D2',
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

  await runTest('generateCombinations - matches linked sections by numeric suffix across component types', async () => {
    resetMocks();
    Section.find = () => ({
      populate: () => Promise.resolve([mockPhysLec1, mockPhysLec2, mockPhysDis1, mockPhysDis2])
    });

    const results = await generateCombinations(['course3'], '202620');

    // L1 (lecture 1) only pairs with D1 (its matching discussion group), and
    // L2 only with D2 -- never L1+D2 or L2+D1, even though linkIdentifier ("L1"
    // vs "D1") never matches as a full string.
    assert.strictEqual(results.length, 2);
    const pairs = results.map((r) => r.groups[0].sections.map((s) => s._id).sort().join('+'));
    assert.ok(pairs.includes('physdis1+physlec1'));
    assert.ok(pairs.includes('physdis2+physlec2'));
    assert.ok(!pairs.includes('physdis1+physlec2'));
    assert.ok(!pairs.includes('physdis2+physlec1'));
  });

  console.log('All generator tests passed successfully.');
};

main();
