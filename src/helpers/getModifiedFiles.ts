import { uniq } from 'lodash';

type Commit = {
    added: string[];
    modified: string[];
    removed: string[];
};

export const getModifiedFiles = (commits: Commit[], checker: (commit: string) => boolean = () => true) =>
    uniq(commits.flatMap((commit: Commit) => commit.added.concat(commit.modified, commit.removed))).filter(checker);
