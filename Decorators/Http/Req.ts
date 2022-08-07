import { setParameterValue } from '../Utils';

function Req(target: any, key: string, index: number) {
    return setParameterValue('req')(target, key);
}

export default Req;
