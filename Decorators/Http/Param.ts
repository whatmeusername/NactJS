import { setParameterValue } from '../Utils';

function Param(target: any, key: string, index: number) {
    return setParameterValue('param')(target, key);
}

export default Param;
