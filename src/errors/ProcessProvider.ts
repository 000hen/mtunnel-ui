export class UseInProcessProviderError extends Error {
    constructor(name: string) {
        super(`${name} must be used inside a ProcessProvider`);
        this.name = "UseInProcessProviderError";
    }
}