import assert from 'assert';
import { getCourses, getCourseById, getCoursePrerequisites, getRequirements } from '../controllers/courseController.js';
import { getSectionsByCourse, getSectionByCrn, getSectionById, getLinkedSections } from '../controllers/sectionController.js';
import { Course } from '../models/Course.js';
import { Prerequisite } from '../models/Prerequisite.js';
import { Requirement } from '../models/Requirement.js';
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

class MockResponse {
  constructor() {
    this.statusCode = 200;
    this.body = null;
  }
  status(code) {
    this.statusCode = code;
    return this;
  }
  json(data) {
    this.body = data;
    return this;
  }
}

const resetMocks = () => {
  Course.countDocuments = () => Promise.resolve(0);
  Course.find = () => ({
    skip: () => ({
      limit: () => ({
        lean: () => Promise.resolve([])
      })
    })
  });
  Course.findById = () => Promise.resolve(null);
  
  Prerequisite.find = () => ({
    populate: () => Promise.resolve([])
  });
  
  Requirement.find = () => Promise.resolve([]);
  
  Section.find = () => Promise.resolve([]);
  Section.findOne = () => Promise.resolve(null);
  Section.findById = () => Promise.resolve(null);
};

const main = async () => {
  console.log('Running Catalog Controller unit tests...');

  await runTest('getCourses - should paginate search results with metadata', async () => {
    resetMocks();
    Course.countDocuments = () => Promise.resolve(45);
    Course.find = () => ({
      skip: () => ({
        limit: () => ({
          lean: () => Promise.resolve([
            { _id: '1', subject: 'CS', courseNumber: '100', title: 'Software Construction' }
          ])
        })
      })
    });

    const req = { query: { page: '2', limit: '10', search: 'software', subject: 'CS' } };
    const res = new MockResponse();

    await getCourses(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.courses.length, 1);
    assert.strictEqual(res.body.pagination.page, 2);
    assert.strictEqual(res.body.pagination.limit, 10);
    assert.strictEqual(res.body.pagination.totalItems, 45);
    assert.strictEqual(res.body.pagination.totalPages, 5);
  });

  await runTest('getCourses - should handle combined [subject] [courseNumber] queries like CS 100 and CS100', async () => {
    resetMocks();
    let capturedFilter = null;
    Course.countDocuments = (filter) => {
      capturedFilter = filter;
      return Promise.resolve(1);
    };
    Course.find = () => ({
      skip: () => ({
        limit: () => ({
          lean: () => Promise.resolve([
            { _id: '1', subject: 'CS', courseNumber: '100', title: 'Software Construction' }
          ])
        })
      })
    });

    // Query with "CS 100"
    const req1 = { query: { search: 'CS 100' } };
    const res1 = new MockResponse();
    await getCourses(req1, res1);
    assert.strictEqual(res1.statusCode, 200);
    assert.ok(capturedFilter.$or.some(cond => cond.subject && cond.courseNumber));

    // Query with "cs100"
    const req2 = { query: { search: 'cs100' } };
    const res2 = new MockResponse();
    await getCourses(req2, res2);
    assert.strictEqual(res2.statusCode, 200);
    assert.ok(capturedFilter.$or.some(cond => cond.subject && cond.courseNumber));
  });

  await runTest('getCourseById - should reject invalid IDs', async () => {
    resetMocks();
    const req = { params: { id: 'invalid-id-format' } };
    const res = new MockResponse();

    await getCourseById(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body.message.includes('Invalid course ID'));
  });

  await runTest('getCourseById - should return 404 when course is missing', async () => {
    resetMocks();
    const req = { params: { id: '683d1a2b4f1c2d3e4f5a6b7c' } };
    const res = new MockResponse();

    await getCourseById(req, res);

    assert.strictEqual(res.statusCode, 404);
  });

  await runTest('getCoursePrerequisites - should group prerequisites by logic group', async () => {
    resetMocks();
    Course.findById = () => Promise.resolve({ _id: '1' });
    Prerequisite.find = () => ({
      populate: () => Promise.resolve([
        { requiredCourseId: { _id: '2', title: 'CS 010A' }, minGrade: 'C', concurrentAllowed: false, logicGroup: 'group1' },
        { requiredCourseId: { _id: '3', title: 'CS 010B' }, minGrade: 'C-', concurrentAllowed: true, logicGroup: 'group1' },
        { requiredCourseId: { _id: '4', title: 'MATH 009A' }, minGrade: 'D', concurrentAllowed: false, logicGroup: 'group2' }
      ])
    });

    const req = { params: { id: '683d1a2b4f1c2d3e4f5a6b7c' } };
    const res = new MockResponse();

    await getCoursePrerequisites(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.groups.length, 2);
    
    const group1 = res.body.groups.find(g => g.logicGroup === 'group1');
    const group2 = res.body.groups.find(g => g.logicGroup === 'group2');
    
    assert.strictEqual(group1.options.length, 2);
    assert.strictEqual(group2.options.length, 1);
    assert.strictEqual(group1.options[0].course.title, 'CS 010A');
    assert.strictEqual(group1.options[1].concurrentAllowed, true);
  });

  await runTest('getRequirements - should return requirement list', async () => {
    resetMocks();
    Requirement.find = () => Promise.resolve([
      { code: 'BEAD', description: 'ABET Depth' }
    ]);

    const req = {};
    const res = new MockResponse();

    await getRequirements(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body[0].code, 'BEAD');
  });

  await runTest('getSectionsByCourse - should query by courseId and termCode', async () => {
    resetMocks();
    Section.find = (query) => {
      assert.strictEqual(query.courseId.toString(), '683d1a2b4f1c2d3e4f5a6b7c');
      assert.strictEqual(query.termCode, '202620');
      return {
        populate: (path) => {
          assert.strictEqual(path, 'courseId');
          return {
            lean: () => Promise.resolve([{ crn: '12345' }])
          };
        }
      };
    };

    const req = {
      params: { courseId: '683d1a2b4f1c2d3e4f5a6b7c' },
      query: { termCode: '202620' }
    };
    const res = new MockResponse();

    await getSectionsByCourse(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.length, 1);
  });

  await runTest('getSectionByCrn - should validate termCode query parameter', async () => {
    resetMocks();
    const req = { params: { crn: '12345' }, query: {} };
    const res = new MockResponse();

    await getSectionByCrn(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body.message.includes('termCode query parameter is required'));
  });

  await runTest('getSectionByCrn - should retrieve section', async () => {
    resetMocks();
    Section.findOne = (query) => {
      assert.strictEqual(query.crn, '12345');
      assert.strictEqual(query.termCode, '202620');
      return Promise.resolve({ crn: '12345', termCode: '202620' });
    };

    const req = { params: { crn: '12345' }, query: { termCode: '202620' } };
    const res = new MockResponse();

    await getSectionByCrn(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.crn, '12345');
  });

  await runTest('getLinkedSections - should return empty linked array if linkIdentifier is null', async () => {
    resetMocks();
    Section.findById = () => Promise.resolve({ _id: '1', linkIdentifier: null });

    const req = { params: { id: '683d1a2b4f1c2d3e4f5a6b7c' } };
    const res = new MockResponse();

    await getLinkedSections(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.linkIdentifier, null);
    assert.strictEqual(res.body.linkedSections.length, 0);
  });

  await runTest('getLinkedSections - should query companion sections', async () => {
    resetMocks();
    Section.findById = () => Promise.resolve({ _id: '1', linkIdentifier: 'A', termCode: '202620' });
    Section.find = (query) => {
      assert.strictEqual(query.linkIdentifier, 'A');
      assert.strictEqual(query.termCode, '202620');
      assert.deepStrictEqual(query._id, { $ne: '1' });
      return Promise.resolve([{ _id: '2', linkIdentifier: 'A', termCode: '202620' }]);
    };

    const req = { params: { id: '683d1a2b4f1c2d3e4f5a6b7c' } };
    const res = new MockResponse();

    await getLinkedSections(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.linkIdentifier, 'A');
    assert.strictEqual(res.body.linkedSections.length, 1);
  });

  console.log('All catalog tests passed successfully.');
};

main();
