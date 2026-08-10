"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestApp = createTestApp;
exports.createAuthenticatedRequest = createAuthenticatedRequest;
const testing_1 = require("@nestjs/testing");
const app_module_1 = require("../src/app.module");
const firebase_auth_guard_1 = require("../src/auth/firebase-auth.guard");
const supertest_1 = __importDefault(require("supertest"));
async function createTestApp(authenticatedUser = { uid: 'test-user', email: 'test@ijac.com.ar', organizationId: 'test-org', role: 'member' }) {
    const moduleBuilder = testing_1.Test.createTestingModule({
        imports: [app_module_1.AppModule],
    });
    if (authenticatedUser) {
        moduleBuilder.overrideGuard(firebase_auth_guard_1.FirebaseAuthGuard).useValue({
            canActivate: (context) => {
                const request = context.switchToHttp().getRequest();
                request.user = {
                    uid: authenticatedUser.uid,
                    email: authenticatedUser.email,
                    organizationId: authenticatedUser.organizationId,
                    role: authenticatedUser.role,
                };
                return true;
            },
        });
    }
    const moduleFixture = await moduleBuilder.compile();
    const app = moduleFixture.createNestApplication();
    app.useGlobalGuards(app.get(firebase_auth_guard_1.FirebaseAuthGuard));
    await app.init();
    return {
        app,
        cleanup: async () => {
            await app.close();
        },
    };
}
function createAuthenticatedRequest(app, token = 'test-token') {
    return {
        get: (path) => (0, supertest_1.default)(app.getHttpServer()).get(path).set('Authorization', `Bearer ${token}`),
        post: (path) => (0, supertest_1.default)(app.getHttpServer()).post(path).set('Authorization', `Bearer ${token}`),
        patch: (path) => (0, supertest_1.default)(app.getHttpServer()).patch(path).set('Authorization', `Bearer ${token}`),
        delete: (path) => (0, supertest_1.default)(app.getHttpServer()).delete(path).set('Authorization', `Bearer ${token}`),
    };
}
//# sourceMappingURL=test-app.js.map