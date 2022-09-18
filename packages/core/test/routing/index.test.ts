import { NactServer } from "../../application";
import {
	BaseController1,
	OptionalController,
	RegexContorller,
	MultiPathsController,
	MultiMethodsController,
} from "./test.controller";

const server = new NactServer("nact-request-test", { loggerEnabled: false });

describe("nact routing functionality", () => {
	beforeAll(() => {
		server.clearModuleConfiguration((key, tm) => {
			tm.useModule({
				controllers: [
					BaseController1,
					OptionalController,
					RegexContorller,
					MultiPathsController,
					MultiMethodsController,
				],
			});
		});
	});

	describe("routing base functionality", () => {
		test("request to static path", async () => {
			const path = "/unique/";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBe("method1");
		});
		test("request to static path, that repeats", async () => {
			const path = "/repeats/";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBe("method3");
		});
		test("request to longer static path", async () => {
			const path = "/test/2";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBe("method4");
		});
		test("request to path, that accepts 1 parameter. Using 'Param' decorator", async () => {
			const path = "/test/54";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBe("54");
		});
		test("request to complex path, that accepts 2 parameters. Using 'Param' decorator", async () => {
			const path = "/complex/20/something/user";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toMatchObject({ id: "20", name: "user" });
		});
		test("request to complex path, that accepts 2 parameters and have other repeat", async () => {
			const path = "/complex1/20/something/admin";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toMatchObject({ number: "20", username: "admin" });
		});
		test("Empty path in request path. Returned path contains parameter", async () => {
			const path = "/missing//bye";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBeUndefined();
		});
		test("request to static path. Should fail", async () => {
			const path = "/unique/andotherpath/fail";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBeUndefined();
		});
		test("request to complex path, that accepts 2 parameters. Should fail", async () => {
			const path = "/complex//something/user";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBeUndefined();
		});
	});

	describe("testing optional functionality", () => {
		test("request to path, that contains 1 optional. Parameter provided", async () => {
			const path = "/optional/user";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBe("optional");
		});
		test("request to path, that contains 1 optional. Parameter not provided", async () => {
			const path = "/optional/";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			// unlike normal paths, we return last optional path from all founded optional paths that fit parameters
			expect(res?.getPayload()?.data).toBe("adminOptional");
		});
		test("request to path, that contains 1 optional, that have non optional variant", async () => {
			const path = "/optional/admin";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBe("nonOptional");
		});
		test("request to path, that contains 1 optional parameter. Parameter provided", async () => {
			const path = "/optional/login/admin";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBe(true);
		});
		test("request to path, that contains 1 optional parameter. Parameter not provided", async () => {
			const path = "/optional/login/";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBe(false);
		});
		test("request to path, that contains 1 optional parameter. Parameter provided. Have repeats", async () => {
			const path = "/optional/login/";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBe(false);
		});
		test("request to path, that contains 1 optional parameter in middle Parameter provided", async () => {
			const path = "/optional/look/4/start/";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBe("page");
		});
		test("request to path, that contains 1 optional parameter in middle Parameter not provided", async () => {
			const path = "/optional/look";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBeUndefined();
		});
		test("request to path, that contains 1 optional parameter. Parameter provided. Have repeats", async () => {
			const path = "/optional/register/user";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBe("someuser3");
		});
		test("request to path, that contains 1 optional parameter. Parameter not provided. Have repeats", async () => {
			const path = "/optional/register/";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBe("someuser4");
		});
		test("request to complex path, that contains 2 optional parameter. Parameter provided.", async () => {
			const path = "/optional/register/";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBe("someuser4");
		});
		test("request to complex path, that contains 2 optional parameter. Parameters provided.", async () => {
			const path = "/optional/logout/20/user/admin";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBe("success");
		});
		test("request to complex path, that contains 2 optional parameter. Parameter not provided.", async () => {
			const path = "/optional/logout/20/user/";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBe("fail");
		});
		test("request to complex path, that contains 2 optional parameter. Parameters not provided.", async () => {
			const path = "/optional/logout/";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBeUndefined();
		});
		test("request to complex path, that contains 2 optional parameter. Parameters provided. Have repeats", async () => {
			const path = "/optional/exit/20/user/admin";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBe("success2");
		});
		test("request to complex path, that contains 2 optional parameter. Parameter not provided. Have repeats", async () => {
			const path = "/optional/exit/20/user";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBe("fail2");
		});
		test("request to complex path, that contains 2 optional parameter. Parameters not provided. Have repeats", async () => {
			const path = "/optional/exit/";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBeUndefined();
		});
		test("Empty path in request path. Returned path contains optional parameter. Parameter in middle. Parameter not provided", async () => {
			const path = "/optional/missing//found";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBeUndefined();
		});
		test("Empty path in request path. Returned path contains optional parameter. Parameter in middle. Parameter provided", async () => {
			const path = "/optional/missing/user/found";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBe("success");
		});
		test("Empty path in request path. Returned path contains optional paramete. Parameter in end. Parameter not provided", async () => {
			const path = "/optional/missing//admin";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBeUndefined();
		});
		test("Empty path in request path. Returned path contains optional paramete. Parameter in end. Parameter provided", async () => {
			const path = "/optional/missing/username/admin";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBe("success");
		});
	});

	describe("testing route regex functionality", () => {
		test("request to regex path, that using string preset.", async () => {
			const path = "/regex/user/123";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBe("num");
		});
		test("request to regex path, that using number preset.", async () => {
			const path = "/regex/user/hello";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBe("str");
		});
		test("request to regex path, that using own regex pattern.", async () => {
			const path = "/regex/user/some22num";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBe("own");
		});
		test("request to regex path, that using own regex pattern. Should fail", async () => {
			const path = "/regex/user/some22num3";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBeUndefined();
		});
		test("request to regex path, that using own regex pattern. Using optional. Not provided", async () => {
			const path = "/regex/user/";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBe("??");
		});
		test("request to regex path, that combined with normal optional. Using optional. Provided", async () => {
			const path = "/regex/admin/name/admin";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBe("combine");
		});
		test("request to regex path, that combined with normal optional. Using optional. not Provided", async () => {
			const path = "/regex/admin/name/";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBe("huh");
		});

		test("request to complex regex path,", async () => {
			const path = "/regex/complex/name/admin/1234/";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBe("complex");
		});
		test("request to complex regex path. Should fail", async () => {
			const path = "/regex/complex/name/admin/";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBeUndefined();
		});
		test("request to complex regex path. Should fail", async () => {
			const path = "/regex/complex/name/admin/onetwo";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBeUndefined();
		});
		test("request to clear regex path", async () => {
			const path = "/regex/test22/";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBe("cleared");
		});
		test("request to clear regex path. Should fail", async () => {
			const path = "/regex/bracket22/";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBe("bracket");
		});
		test("request to clear regex path. using brackets. Should fail", async () => {
			const path = "/regex/bracket22g/";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBeUndefined();
		});
	});

	describe("testing method multi paths", () => {
		test("request to static path. path 1", async () => {
			const path = "/paths/hello";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBe("static");
		});
		test("request to static path. path 2", async () => {
			const path = "/paths/delete";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBe("static");
		});
		test("request to paramets path. path 1", async () => {
			const path = "/paths/param/test";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBe("param");
		});
		test("request to paramets path. path 2", async () => {
			const path = "/paths/param/test/test2";
			const res = await server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.getPayload()?.data).toBe("params");
		});
	});

	describe("testing multi methods paths", () => {
		test("request to static path. path 1. POST", async () => {
			const path = "/methods/hello";
			const res = await server.injectRequest({
				url: path,
				method: "POST",
			});
			expect(res?.getPayload()?.data).toBe("static");
		});
		test("request to static path. path 2. POST", async () => {
			const path = "/methods/delete";
			const res = await server.injectRequest({
				url: path,
				method: "POST",
			});
			expect(res?.getPayload()?.data).toBeUndefined();
		});
		test("request to parameters path. path 1. POST", async () => {
			const path = "/methods/param/22";
			const res = await server.injectRequest({
				url: path,
				method: "POST",
			});
			expect(res?.getPayload()?.data).toBeUndefined();
		});
		test("request to parameters path. path 2. POST", async () => {
			const path = "/methods/param/22/11";
			const res = await server.injectRequest({
				url: path,
				method: "POST",
			});
			expect(res?.getPayload()?.data).toBe("params");
		});
	});
});
