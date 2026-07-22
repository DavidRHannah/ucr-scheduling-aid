import assert from 'assert';
import { protectAdmin } from '../middleware/adminAuth.js';
import { syncData, bulkIntake } from '../controllers/syncController.js';
import { Course } from '../models/Course.js';
import { Section } from '../models/Section.js';
import { Requirement } from '../models/Requirement.js';
import fs from 'fs';

process.env.INTAKE_API_KEY = 'test-admin-key';

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
  Course.findOneAndUpdate = () => Promise.resolve({ _id: 'mock-course-id' });
  Course.bulkWrite = () => Promise.resolve({});
  
  Section.findOneAndUpdate = () => Promise.resolve({});
  Section.bulkWrite = () => Promise.resolve({});
  
  Requirement.bulkWrite = () => Promise.resolve({});
};

const main = async () => {
  console.log('Running Sync Controller unit tests...');

  await runTest('protectAdmin - should reject requests without correct key', async () => {
    const req = { headers: {} };
    const res = new MockResponse();
    let nextCalled = false;

    protectAdmin(req, res, () => { nextCalled = true; });

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(nextCalled, false);
    assert.ok(res.body.message.includes('API key'));
  });

  await runTest('protectAdmin - should pass with valid INTAKE_API_KEY header', async () => {
    const req = { headers: { intake_api_key: 'test-admin-key' } };
    const res = new MockResponse();
    let nextCalled = false;

    protectAdmin(req, res, () => { nextCalled = true; });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(nextCalled, true);
  });

  await runTest('bulkIntake - should invoke Mongoose bulkWrite', async () => {
    resetMocks();
    let courseWriteCount = 0;
    let sectionWriteCount = 0;
    
    Course.bulkWrite = (writes) => {
      courseWriteCount = writes.length;
      return Promise.resolve({});
    };
    Section.bulkWrite = (writes) => {
      sectionWriteCount = writes.length;
      return Promise.resolve({});
    };

    const req = {
      body: {
        courses: [{ subject: 'CS', courseNumber: '100' }],
        sections: [{ crn: '12345', termCode: '202620' }]
      }
    };
    const res = new MockResponse();

    await bulkIntake(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(courseWriteCount, 1);
    assert.strictEqual(sectionWriteCount, 1);
    assert.strictEqual(res.body.ingested.courses, 1);
  });

  await runTest('syncData - should parse files and upsert records', async () => {
    resetMocks();
    
    // Mock fs.readFileSync
    const originalReadFileSync = fs.readFileSync;
    fs.readFileSync = (pathUrl) => {
      const urlStr = pathUrl.toString();
      if (urlStr.includes('reqs.json')) {
        return JSON.stringify([{ code: 'BEAD', description: 'ABET Depth' }]);
      }
      if (urlStr.includes('EN-AbetDepth.json')) {
        return JSON.stringify({
          success: true,
          data: [
            {
              term: '202620',
              courseReferenceNumber: '12345',
              subject: 'CS',
              courseNumber: '010A',
              courseTitle: 'Introduction',
              maximumEnrollment: 80,
              enrollment: 40,
              meetingsFaculty: [{
                meetingTime: {
                  monday: true,
                  beginTime: '1000',
                  endTime: '1150'
                }
              }]
            }
          ]
        });
      }
      return originalReadFileSync(pathUrl);
    };

    let requirementBulkCount = 0;
    Requirement.bulkWrite = (writes) => {
      requirementBulkCount = writes.length;
      return Promise.resolve({});
    };

    let courseUpserted = null;
    Course.findOneAndUpdate = (query, payload) => {
      courseUpserted = payload;
      return Promise.resolve({ _id: 'new-course-id' });
    };

    let sectionUpserted = null;
    Section.findOneAndUpdate = (query, payload) => {
      sectionUpserted = payload;
      return Promise.resolve({});
    };

    const req = { body: { termCode: '202620' } };
    const res = new MockResponse();

    await syncData(req, res);

    // Restore original readFileSync
    fs.readFileSync = originalReadFileSync;

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(requirementBulkCount, 1);
    assert.strictEqual(courseUpserted.subject, 'CS');
    assert.strictEqual(sectionUpserted.crn, '12345');
    assert.deepStrictEqual(sectionUpserted.meetingTimes[0].weekDays, ['M']);
    assert.strictEqual(sectionUpserted.meetingTimes[0].startTime, '10:00');
    assert.strictEqual(sectionUpserted.status, 'Open');
  });

  console.log('All sync tests passed successfully.');
};

main();
