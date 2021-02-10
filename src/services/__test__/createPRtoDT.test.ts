import nock from 'nock';
// Requiring our app implementation
import myProbotApp from '../../index';
import { Probot, ProbotOctokit } from 'probot';
// Requiring our fixtures
// import payload from '../../__test__/fixtures/push.json';
import singleCommitPayload from '../../__test__/fixtures/pushSingleCommit.json';
import {
    DESTINATION_REPO,
    REPO_OWNER,
    BOT_BRANCH_NAME,
    BOT_LABEL_NAME,
    ORIGIN_REPO,
    PR_DESTINATION_BRANCH_NAME,
} from '../../references/constants';

const fs = require('fs');
const path = require('path');

const privateKey = fs.readFileSync(path.join(__dirname, '../../__test__/fixtures/mock-cert.pem'), 'utf-8');

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

    const FILE_NAME = 'types%2Fthree%2Fsrc%2FNewShader.d.ts';

    it('should push new files to the DT fork and create a PR and assign default reviewers and add labels', async () => {
        const mock = nock('https://api.github.com')
            .get(`/repos/${REPO_OWNER}/${DESTINATION_REPO}/branches/${BOT_BRANCH_NAME}`)
            .reply(200)
            .get(`/repos/${REPO_OWNER}/${ORIGIN_REPO}/contents/${FILE_NAME}?ref=master`)
            .reply(200, {
                data: {
                    content: 'code',
                },
            })
            .get(`/repos/${REPO_OWNER}/${DESTINATION_REPO}/contents/${FILE_NAME}?ref=${BOT_BRANCH_NAME}`)
            .reply(204)
            .put(`/repos/${REPO_OWNER}/${DESTINATION_REPO}/contents/${FILE_NAME}`)
            .reply(200)
            .get(`/repos/${REPO_OWNER}/${DESTINATION_REPO}/pulls`)
            .reply(200, [
                {
                    labels: [],
                },
            ])
            .post(`/repos/${REPO_OWNER}/${DESTINATION_REPO}/pulls`)
            .reply(200, {
                number: 1,
            })
            .post(`/repos/${REPO_OWNER}/${DESTINATION_REPO}/pulls/1/requested_reviewers`)
            .reply(200)
            .post(`/repos/${REPO_OWNER}/${DESTINATION_REPO}/issues/1/labels`)
            .reply(200);

        // Receive a webhook event
        await probot.receive({ name: 'push', payload: singleCommitPayload });

        expect(mock.pendingMocks()).toStrictEqual([]);
    });

    it('should push new files to the DT fork and not create a PR if one is already open', async () => {
        const mock = nock('https://api.github.com')
            .get(`/repos/${REPO_OWNER}/${DESTINATION_REPO}/branches/${BOT_BRANCH_NAME}`)
            .reply(200)
            .get(`/repos/${REPO_OWNER}/${ORIGIN_REPO}/contents/${FILE_NAME}?ref=master`)
            .reply(200, {
                data: {
                    content: 'code',
                },
            })
            .get(`/repos/${REPO_OWNER}/${DESTINATION_REPO}/contents/${FILE_NAME}?ref=${BOT_BRANCH_NAME}`)
            .reply(204)
            .put(`/repos/${REPO_OWNER}/${DESTINATION_REPO}/contents/${FILE_NAME}`)
            .reply(200)
            .get(`/repos/${REPO_OWNER}/${DESTINATION_REPO}/pulls`)
            .reply(200, [
                {
                    labels: [
                        {
                            name: BOT_LABEL_NAME,
                        },
                    ],
                },
            ]);

        // Receive a webhook event
        await probot.receive({ name: 'push', payload: singleCommitPayload });

        expect(mock.pendingMocks()).toStrictEqual([]);
    });

    it('should update files to the DT fork and not create a PR if one is already open', async () => {
        const mock = nock('https://api.github.com')
            .get(`/repos/${REPO_OWNER}/${DESTINATION_REPO}/branches/${BOT_BRANCH_NAME}`)
            .reply(200)
            .get(`/repos/${REPO_OWNER}/${ORIGIN_REPO}/contents/${FILE_NAME}?ref=master`)
            .reply(200, {
                content: 'code',
            })
            .get(`/repos/${REPO_OWNER}/${DESTINATION_REPO}/contents/${FILE_NAME}?ref=${BOT_BRANCH_NAME}`)
            .reply(200, {
                content: 'new code',
                sha: 'sha',
            })
            .put(`/repos/${REPO_OWNER}/${DESTINATION_REPO}/contents/${FILE_NAME}`)
            .reply(200)
            .get(`/repos/${REPO_OWNER}/${DESTINATION_REPO}/pulls`)
            .reply(200, [
                {
                    labels: [
                        {
                            name: BOT_LABEL_NAME,
                        },
                    ],
                },
            ]);

        // Receive a webhook event
        await probot.receive({ name: 'push', payload: singleCommitPayload });

        expect(mock.pendingMocks()).toStrictEqual([]);
    });

    it('should no nothing if there are no difference in files', async () => {
        const mock = nock('https://api.github.com')
            .get(`/repos/${REPO_OWNER}/${DESTINATION_REPO}/branches/${BOT_BRANCH_NAME}`)
            .reply(200)
            .get(`/repos/${REPO_OWNER}/${ORIGIN_REPO}/contents/${FILE_NAME}?ref=master`)
            .reply(200, {
                content: 'code',
            })
            .get(`/repos/${REPO_OWNER}/${DESTINATION_REPO}/contents/${FILE_NAME}?ref=${BOT_BRANCH_NAME}`)
            .reply(200, {
                content: 'code',
                sha: 'sha',
            })
            .get(`/repos/${REPO_OWNER}/${DESTINATION_REPO}/pulls`)
            .reply(200, [
                {
                    labels: [
                        {
                            name: BOT_LABEL_NAME,
                        },
                    ],
                },
            ]);

        // Receive a webhook event
        await probot.receive({ name: 'push', payload: singleCommitPayload });

        expect(mock.pendingMocks()).toStrictEqual([]);
    });

    it('should create the branch if theres no branch already & create a PR', async () => {
        const mock = nock('https://api.github.com')
            .get(`/repos/${REPO_OWNER}/${DESTINATION_REPO}/branches/${BOT_BRANCH_NAME}`)
            .reply(204)
            .get(`/repos/${REPO_OWNER}/${DESTINATION_REPO}/branches/${PR_DESTINATION_BRANCH_NAME}`)
            .reply(200, {
                commit: {
                    sha: 'sha',
                },
            })
            .post(`/repos/${REPO_OWNER}/${DESTINATION_REPO}/git/refs`)
            .reply(200)
            .get(`/repos/${REPO_OWNER}/${ORIGIN_REPO}/contents/${FILE_NAME}?ref=master`)
            .reply(200, {
                data: {
                    content: 'code',
                },
            })
            .get(`/repos/${REPO_OWNER}/${DESTINATION_REPO}/contents/${FILE_NAME}?ref=${BOT_BRANCH_NAME}`)
            .reply(204)
            .put(`/repos/${REPO_OWNER}/${DESTINATION_REPO}/contents/${FILE_NAME}`)
            .reply(200)
            .get(`/repos/${REPO_OWNER}/${DESTINATION_REPO}/pulls`)
            .reply(200, [
                {
                    labels: [],
                },
            ])
            .post(`/repos/${REPO_OWNER}/${DESTINATION_REPO}/pulls`)
            .reply(200, {
                number: 1,
            })
            .post(`/repos/${REPO_OWNER}/${DESTINATION_REPO}/pulls/1/requested_reviewers`)
            .reply(200)
            .post(`/repos/${REPO_OWNER}/${DESTINATION_REPO}/issues/1/labels`)
            .reply(200);

        // Receive a webhook event
        await probot.receive({ name: 'push', payload: singleCommitPayload });

        expect(mock.pendingMocks()).toStrictEqual([]);
    });

    afterEach(() => {
        nock.cleanAll();
        nock.enableNetConnect();
    });
});
