import nock from 'nock';
// Requiring our app implementation
import myProbotApp from '../index';
import { Probot, ProbotOctokit } from 'probot';
// Requiring our fixtures
import payload from './fixtures/push.json';

const fs = require('fs');
const path = require('path');

const privateKey = fs.readFileSync(path.join(__dirname, 'fixtures/mock-cert.pem'), 'utf-8');

const mockCreatePRtoDT = jest.fn();
jest.mock('../services/createPRtoDT', () => ({
    createPRtoDT: () => {
        mockCreatePRtoDT();
    },
}));

describe('My Probot app', () => {
    let probot: any;

    beforeEach(() => {
        nock.disableNetConnect();
        probot = new Probot({
            appId: 123,
            privateKey,
            // disable request throttling and retries for testing
            Octokit: ProbotOctokit.defaults({
                retry: { enabled: false },
                throttle: { enabled: false },
            }),
        });
        // Load our app into probot
        probot.load(myProbotApp);
    });

    it('should call createPRtoDT on push', async () => {
        const mock = nock('https://api.github.com');

        // Receive a webhook event
        await probot.receive({ name: 'push', payload });

        expect(mock.pendingMocks()).toStrictEqual([]);
        expect(mockCreatePRtoDT).toHaveBeenCalled();
    });

    it('should not call createPRtoDT on push if repo is not three-ts-types', async () => {
        const mock = nock('https://api.github.com');

        // Receive a webhook event
        await probot.receive({
            name: 'push',
            payload: {
                ref: 'refs/heads/master',
                repository: {
                    name: 'DefinitelyTyped',
                },
            },
        });

        expect(mock.pendingMocks()).toStrictEqual([]);
        expect(mockCreatePRtoDT).not.toHaveBeenCalled();
    });

    afterEach(() => {
        nock.cleanAll();
        nock.enableNetConnect();
        jest.clearAllMocks();
    });
});
