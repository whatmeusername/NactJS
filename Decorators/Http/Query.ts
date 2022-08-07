import { setParameterValue } from '../Utils';

function Query(target: any, key: string, index: number): any {
    return setParameterValue('query')(target, key);
}

export default Query;
