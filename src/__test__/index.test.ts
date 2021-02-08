// You can import your modules
// import index from '../src/index'

import nock from 'nock';
// Requiring our app implementation
import myProbotApp from '../index';
import { Probot, ProbotOctokit } from 'probot';
// Requiring our fixtures
import payload from './fixtures/push.json';

const fs = require('fs');
const path = require('path');

const privateKey = fs.readFileSync(path.join(__dirname, 'fixtures/mock-cert.pem'), 'utf-8');

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

    it('should update three-types/DefinitelyTyped/three-types-bot-updates on push to three-types/three-ts-types/master', async () => {
        const mock = nock('https://api.github.com')
            .get('/repos/three-types/DefinitelyTyped/branches/three-types-bot-updates')
            .reply(200);
        // .get('/repos/three-types/DefinitelyTyped/branches/three')
        // .reply(200, {
        //     commit: {
        //         sha: '1',
        //     },
        // })
        // .post('/repos/three-types/DefinitelyTyped/git/refs')
        // .reply(200);

        // Receive a webhook event
        await probot.receive({ name: 'push', payload });

        expect(mock.pendingMocks()).toStrictEqual([]);
    });

    afterEach(() => {
        nock.cleanAll();
        nock.enableNetConnect();
    });
});

// For more information about testing with Nock see:
// https://github.com/nock/nock
