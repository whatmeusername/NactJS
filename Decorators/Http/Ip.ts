import { setParameterValue } from '../Utils';

function Ip(target: any, key: string, index: number) {
    return setParameterValue('ip')(target, key);
}

export default Ip;
