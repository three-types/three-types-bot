import push from '../../__test__/fixtures/push.json';

import { getModifiedFiles } from '../files';

describe('GetModifiedFiles', () => {
    it('should return an array if no checker is provided', () => {
        const expectedResult = [
            'types/three/src/NewShader.d.ts',
            'README.md',
            'types/three/src/Geometry.d.ts',
            'types/three/src/BufferGeometry.d.ts',
            'types/three/index.d.ts',
            'types/three/OTHER_FILES.txt',
            'types/three/tslint.json',
            'CODE_OF_CONDUCT.md',
            'types/three/three-tests.ts',
            '.gitignore',
        ];
        const modifiedFiles = getModifiedFiles(push.commits);

        expect(modifiedFiles).toEqual(expectedResult);
    });

    it('should only return files related to the checker', () => {
        const expectedResult = [
            'types/three/src/NewShader.d.ts',
            'types/three/src/Geometry.d.ts',
            'types/three/src/BufferGeometry.d.ts',
            'types/three/index.d.ts',
            'types/three/OTHER_FILES.txt',
            'types/three/tslint.json',
            'types/three/three-tests.ts',
        ];
        const modifiedFiles = getModifiedFiles(push.commits, commit => commit.includes('types/three'));

        expect(modifiedFiles).toEqual(expectedResult);
    });
});
