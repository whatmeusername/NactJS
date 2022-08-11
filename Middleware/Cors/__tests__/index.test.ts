import http from 'http';
import NactRequest from '../../../request';
import NactServer, { Controller } from '../../../index';
import NactCors from '../index';
import { Get, Req } from '../../../Decorators/index';

import axios from 'axios';

@Controller('/')
class TestController {
    constructor() {}

    @Get('/')
    TestRoute(@Req req: NactRequest) {
        return { res: 'passed' };
    }
}

const createSimplyServer = async (port: number) => {
    let server = new NactServer({ controllers: [TestController] });
    server.listen(port);
    await sleep(250);
    return server;
};

const TestData = [{ name: 'test', url: 'http://localhost', expect: '' }];

function sleep(ms: number) {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, ms);
    });
}

describe('Cors middleware testing', () => {
    let server: NactServer;
    let serverURL: string = '';

    beforeAll(async () => {
        server = (await createSimplyServer(8000)) as any;
        serverURL = server.serverRunningURL ?? '';
    });
    test.each(TestData)('cors middleware %name', async ({ url, expect }) => {
        server.useMiddleware(NactCors());
        server.injectRequest({ method: 'GET', headers: {}, url: serverURL });
    });
    afterAll(() => {
        server.server.close();
    });
});
