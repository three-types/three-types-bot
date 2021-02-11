import { Context } from 'probot';

import { getModifiedFiles } from '../helpers/files';
import { checkPRList } from '../helpers/pulls';

import {
    REPO_OWNER,
    DESTINATION_REPO,
    BOT_BRANCH_NAME,
    PR_DESTINATION_BRANCH_NAME,
    ORIGIN_REPO,
    BOT_LABEL_NAME,
    DEFAULT_REVIEWERS,
} from '../references/constants';

export async function createPRtoDT(context: Context) {
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
            // create the three-types-bot-updates branch
            await context.octokit.git.updateRef({
                owner: REPO_OWNER,
                repo: DESTINATION_REPO,
                ref: `head/${BOT_BRANCH_NAME}`,
                sha: data.commit.sha,
            });
        }

        // now we do some file magic
        await Promise.all(
            modifiedFiles.map(async file => {
                // get the original content
                const { data: originalData } = await context.octokit.repos.getContent({
                    owner: REPO_OWNER,
                    repo: ORIGIN_REPO,
                    path: file,
                    ref: 'master',
                });
                context.log.info('found data on original branch');

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
                    context.log.info('file does not exist');
                    // the files doesn't exist, we have to create it
                    await context.octokit.repos.createOrUpdateFileContents({
                        owner: REPO_OWNER,
                        repo: DESTINATION_REPO,
                        path: file,
                        branch: BOT_BRANCH_NAME,
                        message: `Syncronize ${file}`,
                        // @ts-expect-error thinks content isn't defined
                        content: originalData.content,
                    });
                    return;
                    // @ts-expect-error thinks content isn't defined
                } else if (originalData.content === destinationData.content) {
                    // files are equal, nothing to do here
                    context.log.info('file is equal');
                    return;
                } else {
                    context.log.info('file exists');
                    // the files exists and we're updating it
                    await context.octokit.repos.createOrUpdateFileContents({
                        owner: REPO_OWNER,
                        repo: DESTINATION_REPO,
                        path: file,
                        branch: BOT_BRANCH_NAME,
                        message: `Syncronize ${file}`,
                        // @ts-expect-error thinks content isn't defined
                        content: originalData.content,
                        // @ts-expect-error thinks sha isn't defined
                        sha: destinationData.sha,
                    });
                }
            }),
        );

        // check if there's a PR with the label attached
        const doesBranchAlreadyHavePr = await checkPRList(
            context,
            pull => pull.labels.filter(label => label.name === BOT_LABEL_NAME).length > 0,
        );

        if (!doesBranchAlreadyHavePr) {
            context.log.info('branch has no PR associated');

            // create the PR
            const {
                data: { number },
            } = await context.octokit.pulls.create({
                owner: REPO_OWNER,
                repo: DESTINATION_REPO,
                head: BOT_BRANCH_NAME,
                base: PR_DESTINATION_BRANCH_NAME,
            });

            // add default reviewers
            await context.octokit.request('POST /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers', {
                owner: REPO_OWNER,
                repo: DESTINATION_REPO,
                pull_number: number,
                reviewers: DEFAULT_REVIEWERS,
            });

            // add the label
            await context.octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/labels', {
                owner: REPO_OWNER,
                repo: DESTINATION_REPO,
                issue_number: number,
                labels: [BOT_LABEL_NAME],
            });
        }

        context.log.info('completed');
    } catch (err) {
        context.log.error(err);
    }
}
