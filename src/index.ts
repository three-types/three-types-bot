import { Probot } from 'probot';

import createPRtoDT from './services/createPRtoDT';

const REPO_NAME = 'three-ts-types';

export = (app: Probot) => {
    app.on('push', async context => {
        const {
            payload: { ref, repository },
        } = context;

        /**
         * check if we've pushed to "three-ts-types" & master
         */
        if (repository.name === REPO_NAME && ref.includes('master')) {
            context.log.info(`change in master@three-ts-types`);
            await createPRtoDT(context);
        }
    });
};
