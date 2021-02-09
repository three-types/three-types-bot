import { Context } from 'probot';
import { Endpoints } from '@octokit/types';

import { REPO_OWNER, DESTINATION_REPO } from '../references/constants';

export type Pull = Endpoints['GET /repos/{owner}/{repo}/pulls']['response']['data'][0];

export const checkPRList = async (ctx: Context, checker: (pull: Pull) => boolean): Promise<boolean> => {
    try {
        const results = [];
        const res = await ctx.octokit.pulls.list({
            owner: REPO_OWNER,
            repo: DESTINATION_REPO,
        });

        res.data.forEach(pull => {
            if (checker(pull)) {
                results.push(pull);
            }
        });

        return results.length > 0;
    } catch (e) {
        ctx.log.error(e);
        return true;
    }
};
