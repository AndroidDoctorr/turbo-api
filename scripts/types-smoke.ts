/**
 * Compile-only smoke test for index.d.ts (see npm script `check-types`).
 */
import {
    buildApp,
    ControllerBase,
    validation,
    httpHelpers,
    serviceFactory,
    stringHelpers,
    type TurboApiUser,
    type TurboDataService,
} from 'turbo-api'

class SmokeController extends ControllerBase {
    constructor() {
        super('Smoke', { title: validation.stringRule(1, 10, true) }, ['title'])
    }
    configureRoutes(): void {
        this.basicCRUD({})
    }
}

export async function smoke(): Promise<void> {
    const _app = await buildApp()
    void _app
    const u: TurboApiUser = { uid: 'x' }
    void u
    const db: TurboDataService | undefined = undefined
    await validation.validateData(
        { title: 'ok' },
        { title: validation.stringRule(1, 10, true) },
        db,
        'Smoke',
    )
    void new SmokeController()
    void httpHelpers.handleRoute
    void serviceFactory.registerService
    void stringHelpers.objectToString({})
}
