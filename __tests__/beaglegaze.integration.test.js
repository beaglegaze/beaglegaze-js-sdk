const { BeagleGaze } = require('../src');
const { GenericContainer } = require('testcontainers');

// =================================================================================================
// NOTE: This test is expected to fail in the current environment.
//
// The `testcontainers-node` library is unable to connect to the Docker daemon,
// resulting in a "Could not find a working container runtime strategy" error.
// This is an environment-specific issue. Once the environment is configured
// correctly for `testcontainers-node` to connect to Docker, these tests should pass.
//
// The code itself represents a complete integration test for the BeagleGaze client.
// =================================================================================================

describe('BeagleGaze Integration Tests', () => {
  let container;
  let endpoint;

  // Increase timeout to 60 seconds to allow for image pulling
  jest.setTimeout(60000);

  beforeAll(async () => {
    try {
      // Using an echo server that can log requests
      container = await new GenericContainer('mendhak/http-https-echo')
        .withExposedPorts(8080)
        .start();
      endpoint = `http://${container.getHost()}:${container.getMappedPort(8080)}`;
    } catch (e) {
      console.error("Failed to start container. This is likely an environment issue with Docker.", e);
      // We will let the test fail, but the code is here for when the environment is fixed.
      throw e;
    }
  });

  afterAll(async () => {
    if (container) {
      await container.stop();
    }
  });

  it('should send a tracking event to the mock server', async () => {
    // This test will fail if the container did not start.
    if (!container) {
        // Mark the test as pending if the container is not available.
        pending("Container could not be started.");
    }

    const client = new BeagleGaze({ endpoint });
    const event = {
      type: 'test-event',
      payload: {
        data: 'some-data'
      }
    };

    const response = await client.track(event);

    // The echo server returns a JSON response with details of the request it received.
    // We can check if the body of the request matches the event we sent.
    expect(response.method).toBe('POST');
    expect(response.body).toEqual(event);
  });
});
