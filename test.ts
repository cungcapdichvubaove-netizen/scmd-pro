import { LoginUseCase } from './src/server/core/use-cases/auth/login.use-case.js';
(async () => {
    try {
        const useCase = new LoginUseCase();
        await useCase.execute({
            tenantCode: "system",
            username: "admin", 
            password: "password",
            clientContext: { ip: "127.0.0.1", userAgent: "curl" }
        });
    } catch (e: any) {
        console.error(e.message, e.stack);
    }
})();
