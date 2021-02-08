import { Context } from 'probot';

import { getModifiedFiles } from '../helpers/getModifiedFiles';
import { mapSeries } from '../helpers/asyncUtil';

const REPO_OWNER = 'three-types';
const ORIGIN_REPO = 'three-ts-types';
const DESTINATION_REPO = 'DefinitelyTyped';
const PR_DESTINATION_BRANCH_NAME = 'three';
const BOT_BRANCH_NAME = 'three-types-bot-updates';

export default async function createPRtoDT(context: Context) {
    const modifiedFiles = getModifiedFiles(context.payload.commits, filename => filename.includes('types/three'));

    const { status } = await context.octokit.repos
        .getBranch({
            owner: REPO_OWNER,
            repo: DESTINATION_REPO,
            branch: BOT_BRANCH_NAME,
        })
        .catch(() => {
            context.log.info(`branch ${BOT_BRANCH_NAME} does not exist in ${DESTINATION_REPO}`);
            return { status: 404 };
        });

    const doesBotBranchExist = status === 200;

    try {
        if (!doesBotBranchExist) {
            // get three branch from DT repo
            const { data } = await context.octokit.repos.getBranch({
                owner: REPO_OWNER,
                repo: DESTINATION_REPO,
                branch: PR_DESTINATION_BRANCH_NAME,
            });
            console.log(data);
            // create the three-types-bot-updates branch
            await context.octokit.git.createRef({
                owner: REPO_OWNER,
                repo: DESTINATION_REPO,
                ref: BOT_BRANCH_NAME,
                sha: data.commit.sha,
            });
        }

        // now we do some file magic
        mapSeries(async file => {
            // get the original content
            const { data: originalData } = await context.octokit.repos.getContent({
                owner: REPO_OWNER,
                repo: ORIGIN_REPO,
                path: file,
                ref: 'master',
            });

            // see if we can get the content at the destination
            const { status, data: destinationData } = await context.octokit.repos
                .getContent({
                    owner: REPO_OWNER,
                    repo: DESTINATION_REPO,
                    path: file,
                    ref: BOT_BRANCH_NAME,
                })
                .catch(() => {
                    context.log.info('file does not exist at destination');
                    return { status: 204, data: { content: '', sha: '' } };
                });
            if (status === 204) {
                // the files doesn't exist, we have to create it
                await context.octokit.repos.createOrUpdateFileContents({
                    owner: REPO_OWNER,
                    repo: DESTINATION_REPO,
                    path: file,
                    message: `Syncronize ${file}`,
                    // @ts-expect-error thinks content isn't defined
                    content: originalData.content,
                });
                return;
                // @ts-expect-error thinks content isn't defined
            } else if (originalData.content === destinationData.content) {
                // files are equal, nothing to do here
                return;
            } else {
                // the files exists and we're updating it
                await context.octokit.repos.createOrUpdateFileContents({
                    owner: REPO_OWNER,
                    repo: DESTINATION_REPO,
                    path: file,
                    message: `Syncronize ${file}`,
                    // @ts-expect-error thinks content isn't defined
                    content: originalData.content,
                    // @ts-expect-error thinks sha isn't defined
                    sha: destinationData.sha,
                });
            }
        }, modifiedFiles);

        /**
         * is there a PR open?
         * IF FALSE
         * create PR from branch to `three` branch
         * assign reviewers to PR
         * ELSE
         * nothing
         */
    } catch (err) {
        context.log.error(err);
    }
}
