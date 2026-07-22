import assert from 'assert';
import { registerUser, loginUser } from '../controllers/authController.js';
import { User } from '../models/User.js';

// Setup environment variables for test
process.env.JWT_SECRET = 'test-secret';

// Test runner helper
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

// Mock Response Helper
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

// Reset Mongoose mocks
const resetMocks = () => {
  User.findOne = () => Promise.resolve(null);
  User.create = () => Promise.resolve({});
};

// Run unit tests
const main = async () => {
  console.log('Running Authentication Controller unit tests...');

  await runTest('registerUser - should validate missing fields', async () => {
    resetMocks();
    const req = { body: {} };
    const res = new MockResponse();

    await registerUser(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.message, 'Validation failed.');
    assert.strictEqual(res.body.errors.length, 3);
  });

  await runTest('registerUser - should validate password length', async () => {
    resetMocks();
    const req = {
      body: {
        email: 'test@email.ucr.edu',
        password: '123',
        displayName: 'Test User'
      }
    };
    const res = new MockResponse();

    await registerUser(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body.errors[0].message.includes('at least 6 characters'));
  });

  await runTest('registerUser - should reject duplicate email', async () => {
    resetMocks();
    // Mock user exists
    User.findOne = () => Promise.resolve({ email: 'duplicate@email.ucr.edu' });

    const req = {
      body: {
        email: 'duplicate@email.ucr.edu',
        password: 'securepassword',
        displayName: 'Test User'
      }
    };
    const res = new MockResponse();

    await registerUser(req, res);

    assert.strictEqual(res.statusCode, 409);
    assert.ok(res.body.errors[0].message.includes('already in use'));
  });

  await runTest('registerUser - should register successfully with valid input', async () => {
    resetMocks();
    const mockCreatedUser = {
      _id: '683d1a2b4f1c2d3e4f5a6b7c',
      email: 'new@email.ucr.edu',
      displayName: 'New User'
    };
    User.create = () => Promise.resolve(mockCreatedUser);

    const req = {
      body: {
        email: 'new@email.ucr.edu',
        password: 'securepassword',
        displayName: 'New User'
      }
    };
    const res = new MockResponse();

    await registerUser(req, res);

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.user.email, 'new@email.ucr.edu');
    assert.ok(res.body.token);
  });

  await runTest('loginUser - should validate missing fields', async () => {
    resetMocks();
    const req = { body: {} };
    const res = new MockResponse();

    await loginUser(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.errors.length, 2);
  });

  await runTest('loginUser - should reject invalid credentials (user not found)', async () => {
    resetMocks();
    const req = {
      body: {
        email: 'missing@email.ucr.edu',
        password: 'somepassword'
      }
    };
    const res = new MockResponse();

    await loginUser(req, res);

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.message, 'Invalid email or password.');
  });

  await runTest('loginUser - should reject invalid credentials (wrong password)', async () => {
    resetMocks();
    const mockUser = {
      email: 'user@email.ucr.edu',
      comparePassword: () => Promise.resolve(false)
    };
    User.findOne = () => Promise.resolve(mockUser);

    const req = {
      body: {
        email: 'user@email.ucr.edu',
        password: 'wrongpassword'
      }
    };
    const res = new MockResponse();

    await loginUser(req, res);

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.message, 'Invalid email or password.');
  });

  await runTest('loginUser - should login successfully with correct credentials', async () => {
    resetMocks();
    const mockUser = {
      _id: '683d1a2b4f1c2d3e4f5a6b7c',
      email: 'user@email.ucr.edu',
      displayName: 'Registered User',
      comparePassword: () => Promise.resolve(true)
    };
    User.findOne = () => Promise.resolve(mockUser);

    const req = {
      body: {
        email: 'user@email.ucr.edu',
        password: 'correctpassword'
      }
    };
    const res = new MockResponse();

    await loginUser(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.user.email, 'user@email.ucr.edu');
    assert.ok(res.body.token);
  });

  console.log('All tests passed successfully.');
};

main();
