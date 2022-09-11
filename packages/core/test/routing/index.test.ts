import NactServer from "../../../../app";
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
		test("request to static path", () => {
			const path = "/unique/";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBe("method1");
		});
		test("request to static path, that repeats", () => {
			const path = "/repeats/";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBe("method3");
		});
		test("request to longer static path", () => {
			const path = "/test/2";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBe("method4");
		});
		test("request to path, that accepts 1 parameter. Using 'Param' decorator", () => {
			const path = "/test/54";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBe("54");
		});
		test("request to complex path, that accepts 2 parameters. Using 'Param' decorator", () => {
			const path = "/complex/20/something/user";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toMatchObject({ id: "20", name: "user" });
		});
		test("request to complex path, that accepts 2 parameters and have other repeat", () => {
			const path = "/complex1/20/something/admin";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toMatchObject({ number: "20", username: "admin" });
		});
		test("Empty path in request path. Returned path contains parameter", () => {
			const path = "/missing//bye";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBeUndefined();
		});
		test("request to static path. Should fail", () => {
			const path = "/unique/andotherpath/fail";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBeUndefined();
		});
		test("request to complex path, that accepts 2 parameters. Should fail", () => {
			const path = "/complex//something/user";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBeUndefined();
		});
	});

	describe("testing optional functionality", () => {
		test("request to path, that contains 1 optional. Parameter provided", () => {
			const path = "/optional/user";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBe("optional");
		});
		test("request to path, that contains 1 optional. Parameter not provided", () => {
			const path = "/optional/";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			// unlike normal paths, we return last optional path from all founded optional paths that fit parameters
			expect(res?.payload?.data).toBe("adminOptional");
		});
		test("request to path, that contains 1 optional, that have non optional variant", () => {
			const path = "/optional/admin";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBe("nonOptional");
		});
		test("request to path, that contains 1 optional parameter. Parameter provided", () => {
			const path = "/optional/login/admin";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBe(true);
		});
		test("request to path, that contains 1 optional parameter. Parameter not provided", () => {
			const path = "/optional/login/";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBe(false);
		});
		test("request to path, that contains 1 optional parameter. Parameter provided. Have repeats", () => {
			const path = "/optional/login/";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBe(false);
		});
		test("request to path, that contains 1 optional parameter in middle Parameter provided", () => {
			const path = "/optional/look/4/start/";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBe("page");
		});
		test("request to path, that contains 1 optional parameter in middle Parameter not provided", () => {
			const path = "/optional/look";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBeUndefined();
		});
		test("request to path, that contains 1 optional parameter. Parameter provided. Have repeats", () => {
			const path = "/optional/register/user";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBe("someuser3");
		});
		test("request to path, that contains 1 optional parameter. Parameter not provided. Have repeats", () => {
			const path = "/optional/register/";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBe("someuser4");
		});
		test("request to complex path, that contains 2 optional parameter. Parameter provided.", () => {
			const path = "/optional/register/";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBe("someuser4");
		});
		test("request to complex path, that contains 2 optional parameter. Parameters provided.", () => {
			const path = "/optional/logout/20/user/admin";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBe("success");
		});
		test("request to complex path, that contains 2 optional parameter. Parameter not provided.", () => {
			const path = "/optional/logout/20/user/";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBe("fail");
		});
		test("request to complex path, that contains 2 optional parameter. Parameters not provided.", () => {
			const path = "/optional/logout/";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBeUndefined();
		});
		test("request to complex path, that contains 2 optional parameter. Parameters provided. Have repeats", () => {
			const path = "/optional/exit/20/user/admin";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBe("success2");
		});
		test("request to complex path, that contains 2 optional parameter. Parameter not provided. Have repeats", () => {
			const path = "/optional/exit/20/user";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBe("fail2");
		});
		test("request to complex path, that contains 2 optional parameter. Parameters not provided. Have repeats", () => {
			const path = "/optional/exit/";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBeUndefined();
		});
		test("Empty path in request path. Returned path contains optional parameter. Parameter in middle. Parameter not provided", () => {
			const path = "/optional/missing//found";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBeUndefined();
		});
		test("Empty path in request path. Returned path contains optional parameter. Parameter in middle. Parameter provided", () => {
			const path = "/optional/missing/user/found";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBe("success");
		});
		test("Empty path in request path. Returned path contains optional paramete. Parameter in end. Parameter not provided", () => {
			const path = "/optional/missing//admin";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBeUndefined();
		});
		test("Empty path in request path. Returned path contains optional paramete. Parameter in end. Parameter provided", () => {
			const path = "/optional/missing/username/admin";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBe("success");
		});
	});

	describe("testing route regex functionality", () => {
		test("request to regex path, that using string preset.", () => {
			const path = "/regex/user/123";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBe("num");
		});
		test("request to regex path, that using number preset.", () => {
			const path = "/regex/user/hello";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBe("str");
		});
		test("request to regex path, that using own regex pattern.", () => {
			const path = "/regex/user/some22num";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBe("own");
		});
		test("request to regex path, that using own regex pattern. Should fail", () => {
			const path = "/regex/user/some22num3";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBeUndefined();
		});
		test("request to regex path, that using own regex pattern. Using optional. Not provided", () => {
			const path = "/regex/user/";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBe("??");
		});
		test("request to regex path, that combined with normal optional. Using optional. Provided", () => {
			const path = "/regex/admin/name/admin";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBe("combine");
		});
		test("request to regex path, that combined with normal optional. Using optional. not Provided", () => {
			const path = "/regex/admin/name/";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBe("huh");
		});

		test("request to complex regex path,", () => {
			const path = "/regex/complex/name/admin/1234/";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBe("complex");
		});
		test("request to complex regex path. Should fail", () => {
			const path = "/regex/complex/name/admin/";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBeUndefined();
		});
		test("request to complex regex path. Should fail", () => {
			const path = "/regex/complex/name/admin/onetwo";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBeUndefined();
		});
		test("request to clear regex path", () => {
			const path = "/regex/test22/";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBe("cleared");
		});
		test("request to clear regex path. Should fail", () => {
			const path = "/regex/bracket22/";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBe("bracket");
		});
		test("request to clear regex path. using brackets. Should fail", () => {
			const path = "/regex/bracket22g/";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBeUndefined();
		});
	});

	describe("testing method multi paths", () => {
		test("request to static path. path 1", () => {
			const path = "/paths/hello";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBe("static");
		});
		test("request to static path. path 2", () => {
			const path = "/paths/delete";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBe("static");
		});
		test("request to paramets path. path 1", () => {
			const path = "/paths/param/test";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBe("param");
		});
		test("request to paramets path. path 2", () => {
			const path = "/paths/param/test/test2";
			const res = server.injectRequest({
				url: path,
				method: "GET",
			});
			expect(res?.payload?.data).toBe("params");
		});
	});

	describe("testing multi methods paths", () => {
		test("request to static path. path 1. POST", () => {
			const path = "/methods/hello";
			const res = server.injectRequest({
				url: path,
				method: "POST",
			});
			expect(res?.payload?.data).toBe("static");
		});
		test("request to static path. path 2. POST", () => {
			const path = "/methods/delete";
			const res = server.injectRequest({
				url: path,
				method: "POST",
			});
			expect(res?.payload?.data).toBeUndefined();
		});
		test("request to parameters path. path 1. POST", () => {
			const path = "/methods/param/22";
			const res = server.injectRequest({
				url: path,
				method: "POST",
			});
			expect(res?.payload?.data).toBeUndefined();
		});
		test("request to parameters path. path 2. POST", () => {
			const path = "/methods/param/22/11";
			const res = server.injectRequest({
				url: path,
				method: "POST",
			});
			expect(res?.payload?.data).toBe("params");
		});
	});
});
